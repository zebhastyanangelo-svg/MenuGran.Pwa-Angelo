// Supabase Edge Functions — guard compartido
//
// Verifica que el llamador sea un superadmin autenticado y provee el cliente
// con service_role key para operaciones administrativas SOLO en el servidor.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildAnonClient(authorizationHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorizationHeader } } },
  );
}

export function buildServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada.');
  }
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Verifica el JWT del llamador y que su perfil tenga rol superadmin. */
export async function assertSuperadmin(
  authorizationHeader: string | null,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (
    authorizationHeader === null ||
    !authorizationHeader.startsWith('Bearer ')
  ) {
    return {
      ok: false,
      response: jsonResponse({ error: 'No autenticado.' }, 401),
    };
  }
  const token = authorizationHeader.slice('Bearer '.length);

  const anonClient = buildAnonClient(authorizationHeader);
  const { data: userData, error: userError } =
    await anonClient.auth.getUser(token);
  if (userError !== null || userData.user === null) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Sesión inválida o expirada.' }, 401),
    };
  }

  const { data: profile, error: profileError } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profileError !== null || profile?.role !== 'superadmin') {
    return {
      ok: false,
      response: jsonResponse(
        { error: 'Solo un Super Admin puede realizar esta operación.' },
        403,
      ),
    };
  }

  return { ok: true, userId: userData.user.id };
}
