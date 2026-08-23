// Supabase Edge Function: create-merchant
//
// Crea al propietario de un comercio vía la API de Admin (auto-confirmado),
// usando la service_role key EXCLUSIVAMENTE en el servidor.
//
// Seguridad:
// 1. Verifica el JWT del llamador y exige rol `superadmin` en su perfil.
// 2. Valida el payload antes de tocar Auth.
// 3. Nunca expone SUPABASE_SERVICE_ROLE_KEY al cliente.
import {
  assertSuperadmin,
  buildServiceRoleClient,
  corsHeaders,
  jsonResponse,
} from '../_shared/superadmin-guard.ts';

interface CreateMerchantPayload {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

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
