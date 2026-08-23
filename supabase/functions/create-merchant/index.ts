// Supabase Edge Function: create-merchant
//
// Crea al propietario de un comercio vía la API de Admin (auto-confirmado),
// usando la service_role key EXCLUSIVAMENTE en el servidor.
//
// Seguridad:
// 1. Verifica el JWT del llamador y exige rol `superadmin` en su perfil.
// 2. Valida el payload antes de tocar Auth.
// 3. Nunca expone SUPABASE_SERVICE_ROLE_KEY al cliente.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CreateMerchantPayload {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function jsonResponse(body: unknown, status = 200): Response {
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

function buildServiceRoleClient(): SupabaseClient {
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
async function assertSuperadmin(
  authorizationHeader: string | null,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (authorizationHeader === null || !authorizationHeader.startsWith('Bearer ')) {
    return { ok: false, response: jsonResponse({ error: 'No autenticado.' }, 401) };
  }
  const token = authorizationHeader.slice('Bearer '.length);

  const anonClient = buildAnonClient(authorizationHeader);
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
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
      response: jsonResponse({ error: 'Solo un Super Admin puede crear comercios.' }, 403),
    };
  }

  return { ok: true, userId: userData.user.id };
}

function validatePayload(
  payload: CreateMerchantPayload,
): { error: string; field: string } | { email: string; password: string; fullName: string } {
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Ingresa un email válido para el propietario.', field: 'email' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      field: 'password',
    };
  }
  if (fullName === '') {
    return { error: 'El nombre del propietario es obligatorio.', field: 'fullName' };
  }
  return { email, password, fullName };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await assertSuperadmin(req.headers.get('Authorization'));
    if (!authResult.ok) {
      return authResult.response;
    }

    let payload: CreateMerchantPayload;
    try {
      payload = (await req.json()) as CreateMerchantPayload;
    } catch {
      return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
    }

    const validated = validatePayload(payload);
    if ('error' in validated) {
      return jsonResponse(validated, 400);
    }

    const serviceClient = buildServiceRoleClient();
    const { data: created, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          full_name: validated.fullName,
          role: 'merchant_owner',
        },
      });

    if (createError !== null) {
      return jsonResponse(
        { error: `Error al crear la cuenta del propietario: ${createError.message}` },
        400,
      );
    }
    if (created.user === null) {
      return jsonResponse({ error: 'No se pudo crear la cuenta del propietario.' }, 500);
    }

    return jsonResponse({ userId: created.user.id });
  } catch {
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
  }
});
