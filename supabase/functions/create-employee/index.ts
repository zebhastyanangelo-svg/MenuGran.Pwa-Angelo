// Supabase Edge Function: create-employee
//
// Crea la cuenta de un empleado (merchant_staff) para un negocio:
// 1. Valida el JWT del llamador y su autorización sobre el merchant
//    (owner del negocio o superadmin).
// 2. Crea al usuario en Supabase Auth con email_confirm: true vía la API de
//    Admin (service_role key SOLO en el servidor).
// 3. Inserta/actualiza el perfil con rol `merchant_staff` y vincula la
//    relación en `merchant_staff` con los permisos granularizados.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildServiceRoleClient, corsHeaders, jsonResponse } from '../_shared/superadmin-guard.ts';

interface CreateEmployeePayload {
  merchantId?: unknown;
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  permissions?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function buildCallerClient(authorizationHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorizationHeader } } },
  );
}

function validatePayload(payload: CreateEmployeePayload):
  | { error: string }
  | {
      merchantId: string;
      email: string;
      password: string;
      fullName: string;
      permissions: Record<string, boolean>;
    } {
  const merchantId =
    typeof payload.merchantId === 'string' ? payload.merchantId.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName =
    typeof payload.fullName === 'string' ? payload.fullName.trim() : '';

  if (merchantId === '') {
    return { error: 'Se requiere el identificador del comercio.' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Ingresa un email válido para el empleado.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (fullName === '') {
    return { error: 'El nombre completo es obligatorio.' };
  }

  const rawPermissions =
    typeof payload.permissions === 'object' && payload.permissions !== null
      ? payload.permissions as Record<string, unknown>
      : {};
  const permissions = {
    can_manage_menu: rawPermissions.can_manage_menu === true,
    can_view_orders: true,
    can_manage_orders: rawPermissions.can_manage_orders === true,
  };

  return { merchantId, email, password, fullName, permissions };
}

/** ¿Puede este usuario gestionar el merchant? Owner activo o superadmin. */
async function canManageMerchant(
  serviceClient: SupabaseClient,
  userId: string,
  merchantId: string,
): Promise<boolean> {
  const ownerResult = await serviceClient
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (ownerResult.data !== null) return true;

  const profileResult = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return profileResult.data?.role === 'superadmin';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let payload: CreateEmployeePayload;
    try {
      payload = (await req.json()) as CreateEmployeePayload;
    } catch {
      return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
    }

    const validated = validatePayload(payload);
    if ('error' in validated) {
      return jsonResponse(validated, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader === null || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'No autenticado.' }, 401);
    }

    // Identidad del llamador con SU propio JWT (nunca la service_role key).
    const callerClient = buildCallerClient(authHeader);
    const { data: userData, error: userError } =
      await callerClient.auth.getUser(authHeader.slice('Bearer '.length));
    if (userError !== null || userData.user === null) {
      return jsonResponse({ error: 'Sesión inválida o expirada.' }, 401);
    }
    const callerId = userData.user.id;

    const serviceClient = buildServiceRoleClient();

    if (!(await canManageMerchant(serviceClient, callerId, validated.merchantId))) {
      return jsonResponse(
        { error: 'No tienes permisos para administrar este comercio.' },
        403,
      );
    }

    // 1. Crear usuario auto-confirmado en Auth.
    const { data: created, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          full_name: validated.fullName,
          role: 'merchant_staff',
        },
      });
    if (createError !== null || created.user === null) {
      return jsonResponse(
        {
          error: `Error al crear la cuenta del empleado: ${
            createError?.message ?? 'sin datos'
          }`,
        },
        400,
      );
    }
    const employeeUserId = created.user.id;

    // 2. Perfil con rol merchant_staff (upsert defensivo si no hay trigger).
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert(
        {
          id: employeeUserId,
          email: validated.email,
          full_name: validated.fullName,
          role: 'merchant_staff',
        },
        { onConflict: 'id', ignoreDuplicates: false },
      );
    if (profileError !== null) {
      await serviceClient.auth.admin.deleteUser(employeeUserId);
      return jsonResponse(
        { error: `Error al crear el perfil del empleado: ${profileError.message}` },
        400,
      );
    }

    // 3. Vinculación con el negocio.
    const { data: staffRow, error: staffError } = await serviceClient
      .from('merchant_staff')
      .insert({
        merchant_id: validated.merchantId,
        user_id: employeeUserId,
        permissions: validated.permissions,
        is_active: true,
      })
      .select('id')
      .single();
    if (staffError !== null || staffRow === null) {
      await serviceClient.auth.admin.deleteUser(employeeUserId);
      return jsonResponse(
        { error: `Error al vincular al empleado con el negocio: ${staffError?.message ?? 'sin datos'}` },
        400,
      );
    }

    return jsonResponse({ userId: employeeUserId, staffId: staffRow.id });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
