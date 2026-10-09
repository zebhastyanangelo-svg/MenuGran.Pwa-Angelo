import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const VAPID_SUBJECT = 'mailto:admin@menugran.com';

/**
 * Par de claves VAPID usado para firmar los envíos Web Push.
 *
 * Origen, en orden de precedencia:
 *  1. Secretos de la Edge Function (`VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`,
 *     `WEB_PUSH_*`, …), que permiten rotar sin tocar la base de datos.
 *  2. Fila `id = 1` de `app_push_config` (solo accesible con service_role).
 *
 * La clave privada nunca se expone al cliente: `app_push_config` no tiene
 * políticas RLS para `anon`/`authenticated`.
 */
interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
  /** Origen del par, para poder diagnosticarlo en la respuesta y en los logs. */
  source: string;
}

/**
 * Parejas de secretos (pública, privada) que el despliegue declara como un
 * mismo par VAPID, en orden de precedencia.
 *
 * No se construye el producto cruzado de todas las claves disponibles: eso
 * podría emparejar la pública de un par con la privada de otro, y el resultado
 * son 401/403 en todos los envíos sin que nada indique la causa.
 */
const VAPID_KEY_PAIRINGS: ReadonlyArray<readonly [string, string]> = [
  ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
  ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY'],
  ['VAPID_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY'],
  ['VAPID_PUBLIC_KEY', 'PUSH_PRIVATE_KEY'],
];

function readEnvKey(...names: string[]): string | null {
  for (const name of names) {
    const named = readNamedKey(name);
    if (named !== null) return named;

    const direct = Deno.env.get(name);
    if (direct !== undefined && direct.trim() !== '') return direct.trim();
  }
  return null;
}

/** Lee el par VAPID de `app_push_config`, o `null` si no está disponible. */
async function readVapidKeysFromDb(client: SupabaseClient): Promise<VapidKeyPair | null> {
  const { data, error } = await client
    .from('app_push_config')
    .select('vapid_public_key, vapid_private_key')
    .eq('id', 1)
    .maybeSingle();

  if (error !== null || data === null) {
    console.error('No se pudo leer app_push_config:', error);
    return null;
  }

  return {
    publicKey: data.vapid_public_key,
    privateKey: data.vapid_private_key,
    source: 'app_push_config',
  };
}

/** Candidatos de claves VAPID, de mayor a menor precedencia. */
async function collectVapidKeyCandidates(client: SupabaseClient): Promise<VapidKeyPair[]> {
  const candidates: VapidKeyPair[] = [];

  for (const [publicName, privateName] of VAPID_KEY_PAIRINGS) {
    const publicKey = readEnvKey(publicName);
    const privateKey = readEnvKey(privateName);
    if (publicKey === null || privateKey === null) continue;
    candidates.push({ publicKey, privateKey, source: `${publicName}+${privateName}` });
  }

  const fromDb = await readVapidKeysFromDb(client);
  if (fromDb !== null) candidates.push(fromDb);

  return candidates;
}

/** Devuelve `null` si el par sirve, o el motivo por el que se descarta. */
async function describeVapidKeyFailure(keys: VapidKeyPair): Promise<string | null> {
  try {
    await importVapidPrivateKey(keys.publicKey, keys.privateKey);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Elige el primer par de claves VAPID realmente utilizable.
 *
 * Validar el par, y no solo su presencia, es lo que evita el 500: un secreto
 * puede estar definido y aun así ser inservible (por ejemplo, una clave privada
 * que no es un escalar P-256). Al descartar los pares inválidos se sigue
 * comprando con la siguiente fuente, de modo que `app_push_config` deja de ser
 * letra muerta cuando los secretos del entorno están mal.
 */
async function resolveVapidKeys(client: SupabaseClient): Promise<VapidKeyPair> {
  const candidates = await collectVapidKeyCandidates(client);
  const failures: string[] = [];

  for (const candidate of candidates) {
    const failure = await describeVapidKeyFailure(candidate);
    if (failure === null) return candidate;
    failures.push(`${candidate.source} (${failure})`);
  }

  throw new Error(
    'No hay un par de claves VAPID utilizable. Define VAPID_PUBLIC_KEY y ' +
      'WEB_PUSH_PRIVATE_KEY con un par P-256 coherente, o corrige la fila id=1 de ' +
      `app_push_config. Candidatos descartados: ${failures.length > 0 ? failures.join(' | ') : 'ninguno encontrado'}.`,
  );
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

/**
 * Autoriza al personal que trabaja un pedido (comercio, repartidor o el
 * propio cliente) para enviar push al cliente del pedido.
 *
 * El llamante debe estar autenticado y pertenecer a una de estas figuras del
 * pedido concreto: el cliente, el dueño o el staff del comercio, el
 * repartidor asignado, o un superadmin. Cualquier otro usuario recibe 403: la
 * relación con el pedido es la única credición válida.
 */
async function assertOrderStaffForCustomer(
  authorizationHeader: string | null,
  orderId: string,
): Promise<{ ok: true; customerId: string } | { ok: false; response: Response }> {
  const authenticated = await assertAuthenticated(authorizationHeader);
  if (!authenticated.ok) return authenticated;
  const callerId = authenticated.userId;

  try {
    const client = buildServiceRoleClient();
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('id, customer_id, merchant_id, driver_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError !== null || order === null || order.customer_id === null) {
      return { ok: false, response: jsonResponse({ error: 'Pedido no encontrado.' }, 404) };
    }

    if (order.customer_id === callerId) {
      return { ok: true, customerId: order.customer_id };
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (profileError === null && profile?.role === 'superadmin') {
      return { ok: true, customerId: order.customer_id };
    }

    if (order.driver_id !== null && order.driver_id === callerId) {
      return { ok: true, customerId: order.customer_id };
    }

    if (order.merchant_id !== null) {
      const { data: owner, error: ownerError } = await client
        .from('merchants')
        .select('id')
        .eq('id', order.merchant_id)
        .eq('owner_id', callerId)
        .maybeSingle();

      if (ownerError === null && owner !== null) {
        return { ok: true, customerId: order.customer_id };
      }

      const { data: staff, error: staffError } = await client
        .from('merchant_staff')
        .select('id')
        .eq('merchant_id', order.merchant_id)
        .eq('user_id', callerId)
        .eq('is_active', true)
        .maybeSingle();

      if (staffError === null && staff !== null) {
        return { ok: true, customerId: order.customer_id };
      }
    }

    return { ok: false, response: jsonResponse({ error: 'No tienes acceso a este pedido.' }, 403) };
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Error al verificar el pedido.' }, 500) };
  }
}

/**
 * Compara dos secretos en tiempo constante.
 *
 * Un `!==` normal filtra information por tiempos: un atacante que sondea el
 * header cron puede acortar el secreto byte a byte. Aquí ambos valores se
 * recorren siempre completos y el resultado no se sale antes de tiempo.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Autentica las llamadas programadas (pg_cron) mediante el secreto compartido.
 *
 * Precedencia del secreto:
 *  1. `CRON_SECRET` del entorno de la Edge Function.
 *  2. `app_push_config.cron_secret`, que es donde ya viven los cron jobs.
 *
 * Acepta el secreto en el header `x-cron-secret` y, por compatibilidad con
 * `pg_net`, también como bearer cuando el header no viene.
 */
async function assertCronAuthorized(req: Request, client: SupabaseClient): Promise<{ ok: true } | { ok: false; response: Response }> {
  const provided = req.headers.get('x-cron-secret')?.trim()
    ?? extractBearerToken(req.headers.get('authorization'))
    ?? '';

  if (provided === '') {
    return { ok: false, response: jsonResponse({ error: 'Falta el secreto del cron.' }, 401) };
  }

  const expected = readEnvKey('CRON_SECRET', 'PUSH_CRON_SECRET') ?? await readCronSecretFromDb(client);
  if (expected === null || expected === '') {
    return { ok: false, response: jsonResponse({ error: 'El secreto del cron no está configurado.' }, 500) };
  }

  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, response: jsonResponse({ error: 'Secreto del cron inválido.' }, 403) };
  }

  return { ok: true };
}

/** Lee `app_push_config.cron_secret`, o `null` si no está disponible. */
async function readCronSecretFromDb(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client
    .from('app_push_config')
    .select('cron_secret')
    .eq('id', 1)
    .maybeSingle();

  if (error !== null || data === null) {
    console.error('No se pudo leer app_push_config.cron_secret:', error);
    return null;
  }
  return data.cron_secret;
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

/**
 * Copys de los disparadores automáticos de antojo.
 *
 * El copy se elige por franja horaria y de forma determinista por día, de modo
 * que el mismo usuario no recibe el mismo texto todas las mañanas (lo que hace
 * que el push se vuelva ruido) pero la variación sigue siendo reproducible al
 * depurar. `{nombre}` lo reemplaza la lógica de personalización ya existente.
 */
const SCHEDULED_COPY: ReadonlyArray<{
  slot: string;
  tag: string;
  titles: readonly string[];
  bodies: readonly string[];
}> = [
  {
    slot: 'desayuno',
    tag: 'menugram-cron-desayuno',
    titles: ['☕ MenuGram', '🍳 Menú de la mañana', 'Buenos días'],
    bodies: [
      '¡Buenos días, {nombre}! ☕ ¿Qué se te antoja desayunar hoy? Hay comercios abiertos cerca de ti.',
      '☕ El día pide desayuno. Mira qué tienes disponible en tu zona.',
      '¡Arrancamos con todo, {nombre}! Pan caliente, jugos y tus favoritos a pocos minutos de ti.',
    ],
  },
  {
    slot: 'media-manana',
    tag: 'menugram-cron-media-manana',
    titles: ['🥗 Entre horas', '🍽️ Se antoja', 'MenuGram'],
    bodies: [
      '¡Esa hambre de media mañana te delató, {nombre}! 🍽️ Encuentra qué hay abierto ahora cerca de ti.',
      '🥪 ¿Un sándwich rápido? Hoy varios comercios de tu zona tienen especiales para picar.',
      'Momento de merienda, {nombre}! Descubre los lugares abiertos que más te quedan cerca.',
    ],
  },
  {
    slot: 'cena',
    tag: 'menugram-cron-cena',
    titles: ['🌙 Hora de la cena', '🍔 MenuGram', '¿Qué cenamos?'],
    bodies: [
      '¡Es hora de la cena, {nombre}! 🌙 ¿Qué se te antoja cenar? Ya hay comercios abiertos cerca.',
      '🍝 Termina el día con un buen plato. Mira qué restaurantes están abiertos en tu zona.',
      'Cena sin complicarte con la hornalla, {nombre}! Pide tu favorito y recíbelo en casa.',
    ],
  },
  {
    slot: 'noche',
    tag: 'menugram-cron-noche',
    titles: ['🍕 Noche de Antojos', '🌜 Menú de noche', 'MenuGram'],
    bodies: [
      '🍕 Todavía hay hambre a estas horas, {nombre}! Descubre los comercios abiertos cerca de ti.',
      '🌜 Antojo nocturno aprobado. Pide ahora y disfruta sin salir de casa.',
      'La noche también se sirve, {nombre}! Encuentra quién sigue abierto en tu zona.',
    ],
  },
];

/**
 * Elige el copy del día para la franja indicada.
 *
 * `dayOfYear` rota los índices con el día del año en lugar de con un número
 * aleatorio: es estable entre reintentos del cron y reparte los copys a lo
 * largo de la semana sin necesidad de estado.
 */
function pickScheduledCopy(slot: string, dayOfYear: number) {
  const group = SCHEDULED_COPY.find((entry) => entry.slot === slot) ?? SCHEDULED_COPY[0]!;
  return {
    title: group.titles[dayOfYear % group.titles.length]!,
    body: group.bodies[dayOfYear % group.bodies.length]!,
    tag: group.tag,
  };
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
 *
 * Excepción: un 401/403 se trata como `auth_error` y TAMBIÉN elimina la
 * suscripción. Como el par VAPID se valida antes de firmar
 * (`assertPrivateKeyMatchesPublicKey`), un 401/403 del push service solo puede
 * significar que el dispositivo se suscribió con una clave VAPID anterior
 * (bundle cacheado en una rotación de claves): esa suscripción nunca podrá
 * entregarse con el par actual y el cliente la recreará al abrir la app.
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

/** Contenido que se envía dentro del payload del push. */
interface PushMessage {
  title: string;
  body: string;
  /** Ruta interna a la que debe llevar el clic. */
  url: string;
  /** Agrupa/reemplaza notificaciones con el mismo tag en el dispositivo. */
  tag: string;
  /**
   * Marca el envío como recordatorio activo: el service worker lo muestra
   * persistente (`requireInteraction`), con vibración y re-alerta.
   */
  reminder: boolean;
}

/**
 * Sanea el destino del clic: solo rutas internas.
 *
 * Un payload con esquema propio o protocol-relative podría sacar al cliente de
 * la PWA hacia un origen ajeno, así que cae al marketplace.
 */
function resolveTargetUrl(rawUrl: unknown, fallback: string): string {
  if (typeof rawUrl !== 'string') return fallback;
  const value = rawUrl.trim();
  if (value === '') return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return fallback;
  return value.startsWith('/') ? value : `/${value}`;
}

/**
 * Tag de la notificación.
 *
 * El service worker genera un tag único cuando el payload no lo trae, pero
 * enviarlo desde aquí permite que una masiva se comporte como una pila real
 * (cada envío se apila) en lugar de depender del reloj del dispositivo.
 */
function resolveMessageTag(rawTag: unknown): string {
  if (typeof rawTag !== 'string') return '';
  return rawTag.trim().slice(0, 120);
}

async function sendPushNotification(
  subscription: PushSubscription,
  message: PushMessage,
  vapidKeys: VapidKeys,
): Promise<PushOutcome> {
  const token = await createVapidToken(
    vapidKeys.publicKey,
    vapidKeys.privateKey,
    VAPID_SUBJECT,
    audienceForEndpoint(subscription.endpoint),
  );

  const payload: Record<string, string> = {
    title: message.title,
    body: message.body,
    url: message.url,
  };
  if (message.tag !== '') payload.tag = message.tag;
  if (message.reminder) payload.reminder = 'true';

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${token}, k=${vapidKeys.publicKey}`,
      TTL: '86400',
      // Los recordatorios despiertan la radio del dispositivo incluso en Doze;
      // el resto de envíos viaja con urgencia normal.
      Urgency: message.reminder ? 'high' : 'normal',
    },
    body: JSON.stringify(payload),
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
 * Importa la clave privada VAPID como clave ECDSA firmante.
 *
 * Acepta los dos formatos con los que se ha desplegado esta clave:
 *  - escalar P-256 crudo de 32 bytes (base64url);
 *  - contenedor PKCS8 DER (base64), que es lo que escriben varias
 *    herramientas de generación de claves VAPID.
 *
 * En ambos casos se verifica que la clave privada realmente pertenezca a la
 * clave pública declarada, comparando el punto EC derivado con las
 * coordenadas de `publicKey`. Sin esa comprobación, un par desalineado
 * importaría sin error (PKCS8 no lleva la pública) y cada envío acabaría en
 * 401/403 del push service sin que nada en el servidor lo señalara.
 */
async function importVapidPrivateKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const privateBytes = base64UrlToBytes(privateKey);
  const { x, y } = publicKeyToCoordinates(publicKey);

  const signingKey =
    privateBytes.length === 32
      ? await crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', d: privateKey, x, y, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
      )
      : await crypto.subtle.importKey(
        'pkcs8',
        privateBytes as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
      );

  await assertPrivateKeyMatchesPublicKey(signingKey, x, y);
  return signingKey;
}

/**
 * Comprueba que el punto público derivado de la clave privada coincida con la
 * clave pública VAPID configurada.
 *
 * WebCrypto no valida esta correspondencia al importar, así que es la única
 * forma de detectar una clave privada de otro par antes de firmar. Comparar
 * en tiempo constante evita además filtrar bytes por tiempos.
 */
async function assertPrivateKeyMatchesPublicKey(
  signingKey: CryptoKey,
  expectedX: string,
  expectedY: string,
): Promise<void> {
  const jwk = await crypto.subtle.exportKey('jwk', signingKey);
  if (timingSafeEqual(jwk.x ?? '', expectedX) && timingSafeEqual(jwk.y ?? '', expectedY)) {
    return;
  }
  throw new Error(
    'La clave privada VAPID no corresponde a la clave pública configurada. ' +
      'Regenera el par VAPID y actualiza ambas a la vez.',
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
  /** Suscritos que el push service rechazó (404/410 o clave VAPID antigua) y fueron eliminados. */
  deleted: number;
  /** Fallos que no invalidan la suscripción (red, 429, 5xx, 4xx). */
  failed: number;
  /** Respuestas 401/403: suscripciones creadas con una clave VAPID anterior; eliminadas. */
  authErrors: number;
  /** Errores locales de configuración (claves VAPID inválidas, etc.). */
  configError?: string;
}

/**
 * Entregas simultáneas máximas.
 *
 * Antes el envío era un `for` secuencial con 10 s de timeout por push: con
 * `pg_cron` configurado en `timeout_milliseconds = 10000`, una masiva a
 * docenas de suscriptores se cortaba a mitad y los últimos nunca recibían nada.
 * El paralelismo acota la duración total sin abrir un connection pool
 * ilimitado contra los push services (FCM/Mozilla), que responden con 429 si se
 * les martillea.
 */
const MAX_CONCURRENT_DELIVERIES = 8;

/** Ejecuta `tasks` con un máximo de `limit` en vuelo a la vez. */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]!();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function deliverToSubscriptions(
  client: SupabaseClient,
  subscriptions: Array<PushSubscription & { full_name?: string | null }>,
  buildMessage: (
    sub: PushSubscription & { full_name?: string | null },
  ) => { title: string; body: string },
  vapidKeys: VapidKeyPair,
  routing?: { url: string; tag: string; reminder?: boolean },
): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, deleted: 0, failed: 0, authErrors: 0 };

  const deliver = async (
    sub: PushSubscription & { full_name?: string | null },
  ): Promise<void> => {
    const { title, body } = buildMessage(sub);

    try {
      const outcome = await sendPushNotification(
        sub,
        {
          title,
          body,
          url: routing?.url ?? '/marketplace',
          tag: routing?.tag ?? '',
          reminder: routing?.reminder === true,
        },
        vapidKeys,
      );

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
          // El par VAPID ya se validó antes de firmar, así que un 401/403
          // significa que la suscripción quedó ligada a una clave VAPID
          // anterior (rotación con bundle cacheado). Es indelebre desde el
          // servidor: se elimina y el dispositivo se re-suscribe solo al
          // abrir la app con el bundle actualizado.
          report.failed += 1;
          report.authErrors += 1;
          report.deleted += 1;
          await deleteSubscription(client, sub.endpoint);
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
  };

  await runWithConcurrency(
    subscriptions.map((sub) => () => deliver(sub)),
    MAX_CONCURRENT_DELIVERIES,
  );

  return report;
}

/** Dia del ano en UTC, usado para rotar los copys de forma reproducible. */
function currentDayOfYear(): number {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - startOfYear) / 86_400_000);
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
    const body = await req.json() as {
      target?: string;
      title?: string;
      body?: string;
      slot?: string;
      tag?: string;
      url?: string;
      reminder?: boolean;
      /** Pedido cuyo cliente recibirá el aviso (target 'order-customer'). */
      orderId?: string;
    };

    const client = buildServiceRoleClient();

    /**
     * Disparadores automáticos de pg_cron.
     *
     * No hay usuario detrás de la llamada (por eso el 401/403 previo), así que
     * la autorización es el secreto compartido. El copy lo elige la función
     * según la franja, de modo que los cron jobs no pueden inventarse textos.
     */
    if (body.target === 'scheduled') {
      const auth = await assertCronAuthorized(req, client);
      if (!auth.ok) return auth.response;

      const slot = body.slot ?? 'desayuno';
      const vapidKeys = await resolveVapidKeys(client);
      const copy = pickScheduledCopy(slot, currentDayOfYear());
      const title = replaceTemplateVariables(body.title ?? copy.title, null);
      const bodyText = replaceTemplateVariables(body.body ?? copy.body, null);

      const subscriptions = await getAllSubscriptions(client);
      if (subscriptions.length === 0) {
        return jsonResponse({
          sent: 0, failed: 0, deleted: 0, deactivated: 0, total: 0,
          slot, vapidSource: vapidKeys.source,
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
        { url: resolveTargetUrl(body.url, '/marketplace'), tag: resolveMessageTag(body.tag) },
      );

      return jsonResponse({
        ...report,
        deactivated: report.deleted,
        total: subscriptions.length,
        slot,
        vapidSource: vapidKeys.source,
      });
    }

    /**
     * Avisos al cliente de un pedido concreto: cambian el comercio, el staff o
     * el repartidor mientras trabaja el pedido. El cliente no necesita la app
     * abierta: el push llega por Web Push a todos sus dispositivos y el
     * service worker lo muestra como recordatorio activo.
     */
    if (body.target === 'order-customer') {
      if (typeof body.orderId !== 'string' || body.orderId.trim() === '') {
        return jsonResponse({ error: 'Falta el identificador del pedido.' }, 400);
      }

      const staff = await assertOrderStaffForCustomer(authHeader, body.orderId);
      if (!staff.ok) return staff.response;

      const vapidKeys = await resolveVapidKeys(client);

      const subscriptions = await getSubscriptionsForUser(client, staff.customerId);
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

      const title = body.title ?? 'Actualización de tu pedido';
      const bodyText = body.body ?? 'Tu pedido tuvo una novedad. Ábrela en la app.';

      const report = await deliverToSubscriptions(
        client,
        subscriptions,
        () => ({ title, body: bodyText }),
        vapidKeys,
        {
          url: resolveTargetUrl(body.url, `/orders/${body.orderId}`),
          tag: resolveMessageTag(body.tag) || `order-${body.orderId}`,
          reminder: body.reminder === true,
        },
      );

      return jsonResponse({
        ...report,
        deactivated: report.deleted,
        total: subscriptions.length,
        vapidSource: vapidKeys.source,
      });
    }

    if (body.target === 'user') {
      const auth = await assertAuthenticated(authHeader);
      if (!auth.ok) return auth.response;

      const vapidKeys = await resolveVapidKeys(client);

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
        {
          url: resolveTargetUrl(body.url, '/marketplace'),
          tag: resolveMessageTag(body.tag),
          reminder: body.reminder === true,
        },
      );

      return jsonResponse({ ...report, deactivated: report.deleted, total: subscriptions.length });
    }

    if (body.target === 'all') {
      // Masivas manuales: superadmin con sesión, o bien el cron con el secreto
      // compartido (mismo camino que `scheduled`, sin copy automático).
      const sessionAuth = await assertSuperadmin(authHeader);
      if (!sessionAuth.ok) {
        const cronAuth = await assertCronAuthorized(req, client);
        if (!cronAuth.ok) return sessionAuth.response;
      }

      const vapidKeys = await resolveVapidKeys(client);

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
        { url: resolveTargetUrl(body.url, '/marketplace'), tag: resolveMessageTag(body.tag) },
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
