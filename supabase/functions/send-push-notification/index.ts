import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function getVapidPublicKey(): string {
  const key =
    readNamedKey('VAPID_PUBLIC_KEY') ??
    Deno.env.get('VAPID_PUBLIC_KEY');
  if (key === undefined || key === '') {
    throw new Error('VAPID_PUBLIC_KEY no configurada.');
  }
  return key;
}

function getVapidPrivateKey(): string {
  const key =
    readNamedKey('VAPID_PRIVATE_KEY') ??
    Deno.env.get('VAPID_PRIVATE_KEY');
  if (key === undefined || key === '') {
    throw new Error('VAPID_PRIVATE_KEY no configurada.');
  }
  return key;
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

  if (subsError !== null || subsData === null) return [];

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

async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
): Promise<{ ok: boolean }> {
  try {
    const vapidPublicKey = getVapidPublicKey();
    const vapidPrivateKey = getVapidPrivateKey();
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@menugram.com';

    const payload = JSON.stringify({ title, body, url: '/' });

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `vapid t=${await createVapidToken(vapidPublicKey, vapidPrivateKey, vapidSubject)}, k=${vapidPublicKey}`,
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

async function createVapidToken(publicKey: string, privateKey: string, subject: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: 'https://fcm.googleapis.com', exp: now + 3600, sub: subject };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = new Uint8Array(atob(privateKey).split('').map(c => c.charCodeAt(0)));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signatureB64}`;
}

async function deactivateSubscription(client: SupabaseClient, endpoint: string): Promise<void> {
  await client
    .from('user_push_subscriptions')
    .update({ is_active: false })
    .eq('endpoint', endpoint);
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

      const subscriptions = await getSubscriptionsForUser(client, auth.userId);
      if (subscriptions.length === 0) {
        return jsonResponse({ sent: 0, failed: 0, deactivated: 0, total: 0 });
      }

      const title = 'MenuGram';
      const bodyText = 'Tienes una nueva notificación.';

      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, title, bodyText);
        if (result.ok) {
          sent++;
        } else {
          failed++;
          await deactivateSubscription(client, sub.endpoint);
        }
      }

      return jsonResponse({ sent, failed, deactivated: 0, total: subscriptions.length });
    }

    if (body.target === 'all') {
      const auth = await assertSuperadmin(authHeader);
      if (!auth.ok) return auth.response;

      const title = addPersonalizedGreeting(body.title ?? 'MenuGram');
      const bodyText = addPersonalizedGreeting(body.body ?? '');

      const subscriptions = await getAllSubscriptions(client);
      if (subscriptions.length === 0) {
        return jsonResponse({ sent: 0, failed: 0, deactivated: 0, total: 0 });
      }

      let sent = 0;
      let failed = 0;
      let deactivated = 0;

      for (const sub of subscriptions) {
        const personalizedTitle = replaceTemplateVariables(title, sub.full_name);
        const personalizedBody = replaceTemplateVariables(bodyText, sub.full_name);

        const result = await sendPushNotification(sub, personalizedTitle, personalizedBody);
        if (result.ok) {
          sent++;
        } else {
          failed++;
          await deactivateSubscription(client, sub.endpoint);
          deactivated++;
        }
      }

      return jsonResponse({ sent, failed, deactivated, total: subscriptions.length });
    }

    return jsonResponse({ error: 'Target inválido.' }, 400);
  } catch (error) {
    console.error('Error en send-push-notification:', error);
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
  }
});
