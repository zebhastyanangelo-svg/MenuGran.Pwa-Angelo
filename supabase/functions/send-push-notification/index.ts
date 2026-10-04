import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const VAPID_SUBJECT = 'mailto:admin@menugran.com';

/**
 * Origen de las claves VAPID, en orden de precedencia:
 *  1. Variables de entorno (`VAPID_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY`).
 *  2. Fila `id = 1` de `app_push_config` (solo accesible con service_role).
 *
 * La tabla actúa como fuente de verdad rotable sin redeploy. La clave privada
 * nunca se expone al cliente: `app_push_config` no tiene políticas RLS para
 * `anon`/`authenticated`.
 */
interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
  source: 'env' | 'db';
}

function readEnvKey(...names: string[]): string | null {
  for (const name of names) {
    const named = readNamedKey(name);
    if (named !== null) return named;

    const direct = Deno.env.get(name);
    if (direct !== undefined && direct.trim() !== '') return direct.trim();
  }
  return null;
}

async function loadVapidKeys(client: SupabaseClient): Promise<VapidKeyPair> {
  const envPublicKey = readEnvKey('VAPID_PUBLIC_KEY', 'WEB_PUSH_PUBLIC_KEY');
  const envPrivateKey = readEnvKey(
    'WEB_PUSH_PRIVATE_KEY',
    'VAPID_PRIVATE_KEY',
    'PUSH_PRIVATE_KEY',
  );

  if (envPublicKey !== null && envPrivateKey !== null) {
    return { publicKey: envPublicKey, privateKey: envPrivateKey, source: 'env' };
  }

  const { data, error } = await client
    .from('app_push_config')
    .select('vapid_public_key, vapid_private_key')
    .eq('id', 1)
    .maybeSingle();

  if (error !== null || data === null) {
    throw new Error(
      'No hay claves VAPID configuradas. Define VAPID_PUBLIC_KEY y WEB_PUSH_PRIVATE_KEY ' +
        'en los secretos de la Edge Function, o inserta la fila id=1 en app_push_config.',
    );
  }

  return {
    publicKey: data.vapid_public_key,
    privateKey: data.vapid_private_key,
    source: 'db',
  };
}

/**
 * Verifica que las claves VAPID configuradas constituyan un par válido
 * (que la privada corresponde a la pública) antes de enviar nada.
 *
 * Sin esto, un desajuste se manifiesta como "0 entregadas" y lleva a
 * desactivar suscripciones que son perfectamente válidas.
 */
async function assertVapidKeysUsable(keys: VapidKeyPair): Promise<void> {
  if (base64UrlToBytes(keys.privateKey).length !== 32) {
    throw new Error(
      'La clave privada VAPID debe ser una clave P-256 cruda de 32 bytes en base64url.',
    );
  }

  try {
    await importVapidPrivateKey(keys.publicKey, keys.privateKey);
  } catch (error) {
    throw new Error(
      `Las claves VAPID no forman un par válido (pública: ${keys.source}). ` +
        `Regenera el par VAPID y actualiza ambas claves. Detalle: ${
          error instanceof Error ? error.message : String(error)
        }`,
    );
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

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

function getPublishableKey(): string {
  const key =
    readNamedKey('SUPABASE_PUBLISHABLE_KEYS') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    Deno.env.get('SUPABASE_ANON_KEY');
  if (key === undefined || key === '') {
    throw new Error('SUPABASE_ANON_KEY no configurada.');
  }
  return key;
}

function buildServiceRoleClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildAuthenticatedClient(authorizationHeader: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getPublishableKey(), {
    global: { headers: { Authorization: authorizationHeader } },
  });
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (authorizationHeader === null) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token === undefined || token === '' ? null : token;
}

async function assertAuthenticated(authorizationHeader: string | null): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const token = extractBearerToken(authorizationHeader);
  if (token === null || authorizationHeader === null) {
    return { ok: false, response: jsonResponse({ error: 'No autenticado.' }, 401) };
  }
  try {
    const client = buildAuthenticatedClient(authorizationHeader);
    const { data, error } = await client.auth.getUser(token);
    if (error !== null || data.user === null) {
      return { ok: false, response: jsonResponse({ error: 'Sesión inválida o expirada.' }, 401) };
    }
    return { ok: true, userId: data.user.id };
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Error de configuración de autenticación.' }, 500) };
  }
}

async function assertSuperadmin(authorizationHeader: string | null): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const authenticated = await assertAuthenticated(authorizationHeader);
  if (!authenticated.ok) return authenticated;

  try {
    const client = buildServiceRoleClient();
    const { data, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', authenticated.userId)
      .maybeSingle();
    if (error !== null || data?.role !== 'superadmin') {
      return { ok: false, response: jsonResponse({ error: 'Solo un Super Admin puede realizar esta operación.' }, 403) };
    }
    return authenticated;
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Error de configuración del servidor.' }, 500) };
  }
}

function replaceTemplateVariables(template: string, fullName: string | null): string {
  const name = (fullName ?? '').trim() || 'cliente';
  const firstName = name.split(/\s+/)[0];

  return template
    .replaceAll('{full_name}', name)
    .replaceAll('{nombre}', firstName)
    .replaceAll('{first_name}', firstName);
}

function hasTemplateVariables(text: string): boolean {
  return text.includes('{nombre}') || text.includes('{full_name}') || text.includes('{first_name}');
}

function addPersonalizedGreeting(template: string): string {
  if (hasTemplateVariables(template)) return template;
  return `¡Hola, {nombre}! ${template}`;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

async function getSubscriptionsForUser(client: SupabaseClient, userId: string): Promise<PushSubscription[]> {
  const { data, error } = await client
    .from('user_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error !== null || data === null) return [];

  return data.map((row: { endpoint: string; p256dh: string; auth: string }) => ({
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }));
}

async function getAllSubscriptions(client: SupabaseClient): Promise<Array<PushSubscription & { user_id: string; full_name: string | null }>> {
  const { data: subsData, error: subsError } = await client
    .from('user_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('is_active', true);

  if (subsError !== null) {
    console.error('Error al obtener suscripciones:', subsError);
    return [];
  }

  if (subsData === null || subsData.length === 0) return [];

  const userIds = [...new Set(subsData.map((s: { user_id: string }) => s.user_id))];

  const { data: profilesData, error: profilesError } = await client
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map<string, string | null>();
  if (profilesError === null && profilesData !== null) {
    for (const p of profilesData as Array<{ id: string; full_name: string | null }>) {
      profileMap.set(p.id, p.full_name);
    }
  }

  return subsData.map((s: { user_id: string; endpoint: string; p256dh: string; auth: string }) => ({
    user_id: s.user_id,
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
    full_name: profileMap.get(s.user_id) ?? null,
  }));
}

/**
 * Resultado de un intento de envío. La distinción entre `gone` y el resto es
 * deliberada: solo un 404/410 del push service significa que la suscripción
 * ya no existe y debe eliminarse. Cualquier otro fallo (error local de
 * configuración, red, 429, 5xx) NO invalida la suscripción.
 */
type PushOutcome =
  | { status: 'sent' }
  | { status: 'gone' }
  | { status: 'retry'; statusCode: number }
  | { status: 'auth_error'; statusCode: number }
  | { status: 'client_error'; statusCode: number };

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/** El `aud` del JWT VAPID debe ser el origen del push service destino. */
function audienceForEndpoint(endpoint: string): string {
  return new URL(endpoint).origin;
}

async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  vapidKeys: VapidKeys,
): Promise<PushOutcome> {
  const token = await createVapidToken(
    vapidKeys.publicKey,
    vapidKeys.privateKey,
    VAPID_SUBJECT,
    audienceForEndpoint(subscription.endpoint),
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${token}, k=${vapidKeys.publicKey}`,
      TTL: '86400',
    },
    body: JSON.stringify({ title, body, url: '/' }),
    signal: AbortSignal.timeout(10000),
  });

  if (response.ok) return { status: 'sent' };
  if (response.status === 404 || response.status === 410) return { status: 'gone' };
  if (response.status === 401 || response.status === 403) {
    return { status: 'auth_error', statusCode: response.status };
  }
  if (response.status === 429 || response.status >= 500) {
    return { status: 'retry', statusCode: response.status };
  }
  return { status: 'client_error', statusCode: response.status };
}

/** Decodifica base64url (VAPID) a bytes. Tolera `+`/`/` y padding ausente. */
function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Extrae las coordenadas X e Y de una clave pública VAPID P-256.
 *
 * La clave pública VAPID es un punto EC sin comprimir de 65 bytes:
 * `0x04 || X(32) || Y(32)`. Esto permite importar la clave privada como JWK
 * (formato que WebCrypto sí soporta) en lugar de PKCS8, que es lo que
 * provocaba el `DataError` silencioso.
 */
function publicKeyToCoordinates(publicKey: string): { x: string; y: string } {
  const bytes = base64UrlToBytes(publicKey);

  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    throw new Error(
      `Clave pública VAPID inválida: se esperaban 65 bytes sin comprimir y llegaron ${bytes.length}.`,
    );
  }

  return {
    x: bytesToBase64Url(bytes.slice(1, 33)),
    y: bytesToBase64Url(bytes.slice(33, 65)),
  };
}

/**
 * Importa la clave privada VAPID (P-256 cruda, 32 bytes base64url) como
 * clave ECDSA firmante usando JWK.
 *
 * Importar por JWK tiene una propiedad útil: si el par público/privado no
 * corresponde, `importKey` falla. Esto convierte un desajuste de claves en
 * un error explícito en lugar de 400 notificaciones fallidas.
 */
async function importVapidPrivateKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const { x, y } = publicKeyToCoordinates(publicKey);

  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKey, x, y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/**
 * Convierte una firma ECDSA cruda (formato P1363: `R||S`, 64 bytes) que
 * produce WebCrypto al formato DER exigido por JWT (ES256).
 *
 * Sin esta conversión, el JWT VAPID se genera con una firma que los push
 * services (FCM, Mozilla autopush, APNs) rechazan.
 */
function rawSignatureToDer(rawSignature: Uint8Array): Uint8Array {
  if (rawSignature.length !== 64) {
    throw new Error(`Firma ECDSA inesperada: ${rawSignature.length} bytes (se esperaban 64).`);
  }

  // R y S son enteros big-endian; se les antepone 0x00 si el bit alto está
  // activo para que no se interpreten como negativos.
  const encodeInteger = (bytes: Uint8Array): Uint8Array => {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
    const trimmed = bytes.slice(start);
    const needsPad = (trimmed[0]! & 0x80) !== 0;
    const value = needsPad
      ? Uint8Array.from([0x00, ...trimmed])
      : trimmed;
    return Uint8Array.from([0x02, value.length, ...value]);
  };

  const r = encodeInteger(rawSignature.slice(0, 32));
  const s = encodeInteger(rawSignature.slice(32, 64));
  const body = Uint8Array.from([...r, ...s]);

  // El contenedor DER declara la longitud en bytes; los enteros son < 0x80
  // por lo que siempre cabe en una sola longitud corta.
  return Uint8Array.from([0x30, body.length, ...body]);
}

/**
 * Genera el JWT VAPID (ES256) para autorizar un envío Web Push.
 *
 * @param audience Origen del push service (ej. `https://fcm.googleapis.com`),
 *                 que debe corresponder al endpoint destino.
 */
async function createVapidToken(
  publicKey: string,
  privateKey: string,
  subject: string,
  audience: string,
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 3600, sub: subject };

  const headerB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));

  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importVapidPrivateKey(publicKey, privateKey);

  const rawSignature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );

  return `${signingInput}.${bytesToBase64Url(rawSignatureToDer(rawSignature))}`;
}

/**
 * Elimina físicamente una suscripción que el push service confirmó perdida
 * (404/410). No se marca como inactiva: se borra, para no conservar tokens
 * obsoletos que solo volverían a fallar.
 */
async function deleteSubscription(client: SupabaseClient, endpoint: string): Promise<void> {
  const { error } = await client
    .from('user_push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error !== null) {
    console.error('No se pudo eliminar la suscripción caducada:', error);
  }
}

interface DeliveryReport {
  sent: number;
  /** Suscritos que el push service rechazó con 404/410 y fueron eliminados. */
  deleted: number;
  /** Fallos que no invalidan la suscripción (red, 429, 5xx, 4xx). */
  failed: number;
  /** Respuestas 401/403: indican un problema de claves VAPID, no del cliente. */
  authErrors: number;
  /** Errores locales de configuración (claves VAPID inválidas, etc.). */
  configError?: string;
}

async function deliverToSubscriptions(
  client: SupabaseClient,
  subscriptions: Array<PushSubscription & { full_name?: string | null }>,
  buildPayload: (sub: PushSubscription & { full_name?: string | null }) => { title: string; body: string },
  vapidKeys: VapidKeyPair,
): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, deleted: 0, failed: 0, authErrors: 0 };

  for (const sub of subscriptions) {
    const { title, body } = buildPayload(sub);

    try {
      const outcome = await sendPushNotification(sub, title, body, vapidKeys);

      switch (outcome.status) {
        case 'sent':
          report.sent += 1;
          break;
        case 'gone':
          report.failed += 1;
          report.deleted += 1;
          await deleteSubscription(client, sub.endpoint);
          break;
        case 'auth_error':
          report.failed += 1;
          report.authErrors += 1;
          break;
        default:
          report.failed += 1;
          break;
      }
    } catch (error) {
      // Error local (configuración, red): la suscripción sigue siendo válida.
      report.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      report.configError ??= message;
      console.error('Fallo local al enviar push (la suscripción se conserva):', message);
    }
  }

  return report;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json() as { target?: string; title?: string; body?: string };

    const client = buildServiceRoleClient();

    if (body.target === 'user') {
      const auth = await assertAuthenticated(authHeader);
      if (!auth.ok) return auth.response;

      const vapidKeys = await loadVapidKeys(client);
      await assertVapidKeysUsable(vapidKeys);

      const subscriptions = await getSubscriptionsForUser(client, auth.userId);
      if (subscriptions.length === 0) {
        return jsonResponse({
          sent: 0,
          failed: 0,
          deleted: 0,
          deactivated: 0,
          total: 0,
          vapidSource: vapidKeys.source,
        });
      }

      const title = body.title ?? 'MenuGran';
      const bodyText = body.body ?? 'Tienes una nueva notificación.';

      const report = await deliverToSubscriptions(
        client,
        subscriptions,
        () => ({ title, body: bodyText }),
        vapidKeys,
      );

      return jsonResponse({ ...report, deactivated: report.deleted, total: subscriptions.length });
    }

    if (body.target === 'all') {
      const auth = await assertSuperadmin(authHeader);
      if (!auth.ok) return auth.response;

      const vapidKeys = await loadVapidKeys(client);
      await assertVapidKeysUsable(vapidKeys);

      const title = addPersonalizedGreeting(body.title ?? 'MenuGran');
      const bodyText = addPersonalizedGreeting(body.body ?? '');

      const subscriptions = await getAllSubscriptions(client);
      if (subscriptions.length === 0) {
        return jsonResponse({
          sent: 0,
          failed: 0,
          deleted: 0,
          deactivated: 0,
          total: 0,
          vapidSource: vapidKeys.source,
        });
      }

      const report = await deliverToSubscriptions(
        client,
        subscriptions,
        (sub) => ({
          title: replaceTemplateVariables(title, sub.full_name ?? null),
          body: replaceTemplateVariables(bodyText, sub.full_name ?? null),
        }),
        vapidKeys,
      );

      return jsonResponse({
        ...report,
        deactivated: report.deleted,
        total: subscriptions.length,
        vapidSource: vapidKeys.source,
      });
    }

    return jsonResponse({ error: 'Target inválido.' }, 400);
  } catch (error) {
    console.error('Error en send-push-notification:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
