import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.112.2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseUrl(): string {
  const value = Deno.env.get('SUPABASE_URL')?.trim();
  if (value === undefined || value === '') {
    throw new Error('SUPABASE_URL no configurada.');
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('invalid-protocol');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error('SUPABASE_URL no configurada correctamente.');
  }
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

export function buildAuthenticatedClient(
  authorizationHeader: string,
): SupabaseClient {
  return createClient(getSupabaseUrl(), getPublishableKey(), {
    global: { headers: { Authorization: authorizationHeader } },
  });
}

export function buildServiceRoleClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (authorizationHeader === null) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token === undefined || token === '' ? null : token;
}

function authFailure(error: string, status: number): AuthResult {
  return { ok: false, response: jsonResponse({ error }, status) };
}

export async function assertAuthenticated(
  authorizationHeader: string | null,
): Promise<AuthResult> {
  const token = extractBearerToken(authorizationHeader);
  if (token === null || authorizationHeader === null) {
    return authFailure('No autenticado.', 401);
  }
  try {
    const client = buildAuthenticatedClient(authorizationHeader);
    const { data, error } = await client.auth.getUser(token);
    if (error !== null || data.user === null) {
      return authFailure('Sesión inválida o expirada.', 401);
    }
    return { ok: true, userId: data.user.id };
  } catch {
    return authFailure('Error de configuración de autenticación.', 500);
  }
}

export async function assertSuperadmin(
  authorizationHeader: string | null,
): Promise<AuthResult> {
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
      return authFailure('Solo un Super Admin puede realizar esta operación.', 403);
    }
    return authenticated;
  } catch {
    return authFailure('Error de configuración del servidor.', 500);
  }
}
