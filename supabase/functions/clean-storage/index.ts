import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/** Bucket que se limpia y tabla/columna donde viven las rutas activas. */
interface CleanupTarget {
  bucket: string;
  table: string;
  column: string;
}

/**
 * Objetivo de la limpieza: el bucket privado `payment-proofs`.
 *
 * `orders.payment_proof_url` guarda la ruta del objeto (`storage.objects.name`,
 * p. ej. `tmp/abc.jpg` de un checkout abandonado o `<orderId>/abc.jpg`).
 * Los huérfanos son archivos sin ninguna referencia activa: comprobantes
 * subidos cuyo pedido nunca se creó. Las imágenes del catálogo son externas
 * (ImgBB/Cloudinary) y no forman parte de este bucket.
 */
const DEFAULT_TARGET: CleanupTarget = {
  bucket: 'payment-proofs',
  table: 'orders',
  column: 'payment_proof_url',
};

/** Antigüedad mínima de un huérfano antes de borrarlo (horas), con topes. */
const DEFAULT_MIN_AGE_HOURS = 24;
const MIN_AGE_HOURS_FLOOR = 1;
const MIN_AGE_HOURS_CEILING = 24 * 30;

/** Tamaño de página de `.list()` de Storage y de la consulta de referencias. */
const LIST_PAGE_SIZE = 100;
const REFERENCES_PAGE_SIZE = 500;
/** Archivos por llamada a `.remove()`. */
const REMOVE_BATCH_SIZE = 100;
/** Cortes de seguridad del recorrido del bucket (bucle descontrolado). */
const MAX_FILES_SCANNED = 50_000;
const MAX_FOLDERS_SCANNED = 5_000;

// ─── Respuestas y entorno ────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Lee un secreto del entorno, tolerando el formato JSON `{"default": "..."}`
 * con el que la plataforma inyecta `SUPABASE_SECRET_KEYS`.
 */
function readNamedKey(name: string): string | null {
  const rawValue = Deno.env.get(name);
  if (rawValue === undefined || rawValue === '') return null;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (isRecord(parsed) && typeof parsed.default === 'string') {
      return parsed.default === '' ? null : parsed.default;
    }
  } catch {
    return null;
  }
  return null;
}

function getSupabaseUrl(): string {
  const value = Deno.env.get('SUPABASE_URL')?.trim();
  if (value === undefined || value === '') {
    throw new Error('SUPABASE_URL no configurada.');
  }
  return value.replace(/\/$/, '');
}

function getServiceRoleKey(): string {
  const key =
    readNamedKey('SUPABASE_SECRET_KEYS') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY');
  if (key === undefined || key === '') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada.');
  }
  return key;
}

function buildServiceRoleClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Autorización ────────────────────────────────────────────────────────────

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (authorizationHeader === null) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token === undefined || token === '' ? null : token;
}

/**
 * Claim `role` del JWT, decodificado sin verificar la firma: con `verify_jwt`
 * activo el edge runtime ya validó firma y expiración antes de llegar aquí.
 */
function readJwtRole(token: string): string | null {
  const payloadBase64 = token.split('.')[1];
  if (payloadBase64 === undefined) return null;
  try {
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));
    return isRecord(payload) && typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Autoriza la llamada de dos formas: con la service_role key (la usa el job
 * de pg_cron, que no tiene sesión de usuario) o con la sesión de un
 * superadmin (para ejecuciones manuales y dry-runs).
 */
async function assertAuthorized(
  req: Request,
  client: SupabaseClient,
): Promise<{ ok: true; invokedBy: string } | { ok: false; response: Response }> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (token === null) {
    return { ok: false, response: jsonResponse({ error: 'No autenticado.' }, 401) };
  }

  if (readJwtRole(token) === 'service_role') {
    return { ok: true, invokedBy: 'service_role' };
  }

  const { data: userData, error: sessionError } = await client.auth.getUser(token);
  if (sessionError !== null || userData.user === null) {
    return { ok: false, response: jsonResponse({ error: 'Sesión inválida o expirada.' }, 401) };
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError !== null || profile?.role !== 'superadmin') {
    return {
      ok: false,
      response: jsonResponse({ error: 'Solo un Super Admin puede ejecutar la limpieza manualmente.' }, 403),
    };
  }

  return { ok: true, invokedBy: userData.user.id };
}

// ─── Listado del bucket ──────────────────────────────────────────────────────

interface StorageListEntry {
  name: string;
  id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface StorageFile {
  path: string;
  createdAtMs: number | null;
}

function joinPath(prefix: string, name: string): string {
  return prefix === '' ? name : `${prefix}/${name}`;
}

function readCreatedAtMs(entry: StorageListEntry): number | null {
  const raw = entry.created_at ?? entry.updated_at;
  if (typeof raw !== 'string') return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Recorre el bucket completo (carpetas incluidas) con paginación por offset.
 *
 * En `.list()` las carpetas aparecen con `id === null` y los archivos con
 * `id` definido, así que hay que bajar recursivamente a cada carpeta para
 * enumerar todos los archivos.
 */
async function listBucketFiles(client: SupabaseClient, bucket: string): Promise<StorageFile[]> {
  const files: StorageFile[] = [];
  const pendingFolders: string[] = [''];
  let foldersVisited = 0;

  while (pendingFolders.length > 0) {
    const folder = pendingFolders.shift()!;
    foldersVisited += 1;
    if (foldersVisited > MAX_FOLDERS_SCANNED) {
      throw new Error(`Demasiadas carpetas en '${bucket}' (>${MAX_FOLDERS_SCANNED}).`);
    }

    let offset = 0;
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(folder, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error !== null) {
        throw new Error(`No se pudo listar '${folder || '/'}' en '${bucket}': ${error.message}`);
      }

      for (const entry of (data ?? []) as StorageListEntry[]) {
        if (entry.id === null) {
          pendingFolders.push(joinPath(folder, entry.name));
          continue;
        }
        files.push({ path: joinPath(folder, entry.name), createdAtMs: readCreatedAtMs(entry) });
        if (files.length > MAX_FILES_SCANNED) {
          throw new Error(`Demasiados archivos en '${bucket}' (>${MAX_FILES_SCANNED}).`);
        }
      }

      if ((data?.length ?? 0) < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }
  }

  return files;
}

// ─── Referencias activas en la base de datos ─────────────────────────────────

/**
 * Normaliza una referencia de la base de datos a la ruta del objeto dentro
 * del bucket. Admite la ruta desnuda (`tmp/abc.jpg`), con prefijo de bucket
 * (`payment-proofs/tmp/abc.jpg`) y URLs de objeto (públicas, firmadas o
 * autenticadas) que apunten a este bucket. Devuelve `null` si la referencia
 * no corresponde al bucket que se está limpiando.
 */
function normalizeReference(raw: string, bucket: string): string | null {
  const value = raw.trim();
  if (value === '') return null;

  try {
    const url = new URL(value);
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:sign\/|authenticated\/|public\/)?([^/]+)\/(.+)$/,
    );
    if (match === null || match[1] !== bucket) return null;
    return decodeURIComponent(match[2]);
  } catch {
    const withBucketPrefix = `${bucket}/`;
    return value.startsWith(withBucketPrefix) ? value.slice(withBucketPrefix.length) : value;
  }
}

/**
 * Rutas activas referenciadas por la tabla objetivo, paginadas para no
 * depender del límite de filas de PostgREST (`max_rows = 1000`).
 */
async function collectActiveReferences(
  client: SupabaseClient,
  target: CleanupTarget,
): Promise<Set<string>> {
  const references = new Set<string>();

  for (let offset = 0;; offset += REFERENCES_PAGE_SIZE) {
    const { data, error } = await client
      .from(target.table)
      .select(target.column)
      .not(target.column, 'is', null)
      .range(offset, offset + REFERENCES_PAGE_SIZE - 1);

    if (error !== null) {
      throw new Error(`No se pudo leer ${target.table}.${target.column}: ${error.message}`);
    }

    for (const row of data as Array<Record<string, unknown>>) {
      const raw = row[target.column];
      if (typeof raw !== 'string') continue;
      const path = normalizeReference(raw, target.bucket);
      if (path !== null) references.add(path);
    }

    if (data.length < REFERENCES_PAGE_SIZE) break;
  }

  return references;
}

// ─── Clasificación y borrado ────────────────────────────────────────────────

interface OrphanClassification {
  orphans: string[];
  referenced: number;
  skippedRecent: number;
  skippedUnknownAge: number;
}

/**
 * Separa los archivos en huérfanos (sin referencia activa) y contadores de
 * los que se conservan: referenciados, demasiado recientes (período de
 * gracia) o sin fecha fiable (se conservan por seguridad).
 */
function classifyFiles(
  files: StorageFile[],
  references: Set<string>,
  minAgeMs: number,
  nowMs: number,
): OrphanClassification {
  const result: OrphanClassification = {
    orphans: [],
    referenced: 0,
    skippedRecent: 0,
    skippedUnknownAge: 0,
  };

  for (const file of files) {
    if (references.has(file.path)) {
      result.referenced += 1;
    } else if (file.createdAtMs === null) {
      result.skippedUnknownAge += 1;
    } else if (nowMs - file.createdAtMs < minAgeMs) {
      result.skippedRecent += 1;
    } else {
      result.orphans.push(file.path);
    }
  }

  return result;
}

interface RemovalOutcome {
  deleted: number;
  failures: number;
}

/** Borra los huérfanos por lotes y devuelve el recuento de bajas y fallos. */
async function removeOrphanFiles(
  client: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<RemovalOutcome> {
  const outcome: RemovalOutcome = { deleted: 0, failures: 0 };

  for (let start = 0; start < paths.length; start += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(start, start + REMOVE_BATCH_SIZE);
    const { data, error } = await client.storage.from(bucket).remove(batch);

    if (error !== null) {
      outcome.failures += batch.length;
      console.error(
        `No se pudo borrar el lote de ${batch.length} archivos de '${bucket}':`,
        error.message,
      );
      continue;
    }

    outcome.deleted += (data ?? []).length;
  }

  return outcome;
}

// ─── Orquestación ────────────────────────────────────────────────────────────

interface BucketCleanupSummary {
  bucket: string;
  scanned: number;
  referenced: number;
  skippedRecent: number;
  skippedUnknownAge: number;
  orphans: number;
  deleted: number;
  deleteFailures: number;
  dryRun: boolean;
}

/**
 * Limpia un bucket: lista sus archivos, recopila las referencias activas,
 * clasifica los huérfanos y (salvo dry-run) los elimina por lotes.
 */
async function cleanBucket(
  client: SupabaseClient,
  target: CleanupTarget,
  options: { dryRun: boolean; minAgeMs: number },
): Promise<BucketCleanupSummary> {
  const files = await listBucketFiles(client, target.bucket);
  const references = await collectActiveReferences(client, target);
  const classification = classifyFiles(files, references, options.minAgeMs, Date.now());

  const summary: BucketCleanupSummary = {
    bucket: target.bucket,
    scanned: files.length,
    referenced: classification.referenced,
    skippedRecent: classification.skippedRecent,
    skippedUnknownAge: classification.skippedUnknownAge,
    orphans: classification.orphans.length,
    deleted: 0,
    deleteFailures: 0,
    dryRun: options.dryRun,
  };

  if (options.dryRun || classification.orphans.length === 0) return summary;

  const outcome = await removeOrphanFiles(client, target.bucket, classification.orphans);
  summary.deleted = outcome.deleted;
  summary.deleteFailures = outcome.failures;
  return summary;
}

interface CleanupRequest {
  /** Con `true` solo reporta lo que borraría, sin eliminar nada. */
  dryRun?: boolean;
  /** Antigüedad mínima de un huérfano en horas (por defecto 24). */
  maxAgeHours?: number;
}

async function readJsonBody(req: Request): Promise<CleanupRequest> {
  try {
    const parsed: unknown = await req.json();
    return isRecord(parsed) ? parsed as CleanupRequest : {};
  } catch {
    return {};
  }
}

/** Horas mínimas de antigüedad de un huérfano, con topes razonables. */
function resolveMinAgeMs(rawHours: unknown): number {
  const hours = typeof rawHours === 'number' && Number.isFinite(rawHours)
    ? rawHours
    : DEFAULT_MIN_AGE_HOURS;
  const clamped = Math.min(Math.max(hours, MIN_AGE_HOURS_FLOOR), MIN_AGE_HOURS_CEILING);
  return clamped * 3_600_000;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const client = buildServiceRoleClient();
    const auth = await assertAuthorized(req, client);
    if (!auth.ok) return auth.response;

    const body = await readJsonBody(req);
    const minAgeMs = resolveMinAgeMs(body.maxAgeHours);
    const dryRun = body.dryRun === true;
    const summary = await cleanBucket(client, DEFAULT_TARGET, { dryRun, minAgeMs });

    const response = { ok: true, invokedBy: auth.invokedBy, buckets: [summary] };
    console.log('clean-storage:', JSON.stringify(response));
    return jsonResponse(response);
  } catch (error) {
    console.error('Error en clean-storage:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
