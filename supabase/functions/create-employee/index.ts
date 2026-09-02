// Supabase Edge Function: create-employee
//
// Flujo idempotente para crear/vincular un empleado (merchant_staff):
// 1. Valida el JWT del llamador y su autorización sobre el merchant.
// 2. Intenta crear el usuario en Supabase Auth.
//    Si ya existe, lo resuelve por email.
// 3. Upsert del perfil con rol `merchant_staff`.
// 4. Vincula la relación en `merchant_staff` con los permisos.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildServiceRoleClient, corsHeaders, jsonResponse } from '../_shared/superadmin-guard.ts';

interface CreateEmployeePayload {
  merchantId?: unknown;
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  role?: unknown;
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
      role: 'merchant_staff' | 'driver';
      permissions: Record<string, boolean>;
    } {
  const merchantId =
    typeof payload.merchantId === 'string' ? payload.merchantId.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName =
    typeof payload.fullName === 'string' ? payload.fullName.trim() : '';

  const VALID_ROLES = ['merchant_staff', 'driver'];
  const role =
    typeof payload.role === 'string' && VALID_ROLES.includes(payload.role)
      ? (payload.role as 'merchant_staff' | 'driver')
      : 'merchant_staff';

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

  // Los repartidores siempre reciben permisos de pedidos, ignorando lo enviado.
  const permissions = role === 'driver'
    ? {
        can_manage_orders: true,
        can_manage_menu: false,
        can_manage_settings: false,
        can_view_metrics: false,
      }
    : {
        can_manage_orders: rawPermissions.can_manage_orders === true,
        can_manage_menu: rawPermissions.can_manage_menu === true,
        can_manage_settings: rawPermissions.can_manage_settings === true,
        can_view_metrics: rawPermissions.can_view_metrics === true,
      };

  return { merchantId, email, password, fullName, role, permissions };
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

/**
 * Resuelve el ID de un usuario de Auth existente por correo.
 * Usa la API Admin (listUsers con filtro) ya que getUserByEmail no
 * existe como método directo en el SDK v2.
 */
async function findUserByEmail(
  serviceClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await serviceClient.auth.admin.listUsers({
    filters: { email },
  });
  if (error !== null || data?.users === undefined) return null;

  const exactMatch = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return exactMatch?.id ?? null;
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

    // --- 1. Crear usuario o resolver existente (flujo idempotente) ---
    let employeeUserId: string;
    let isNewUser = false;

    const { data: created, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          full_name: validated.fullName,
          role: validated.role,
        },
      });

    if (createError === null && created.user !== null) {
      employeeUserId = created.user.id;
      isNewUser = true;
    } else {
      // El error "User Already Registered" (o similar) indica que ya existe.
      const rawMsg = createError?.message?.toLowerCase() ?? '';
      const alreadyExists =
        rawMsg.includes('already') ||
        rawMsg.includes('registered') ||
        rawMsg.includes('exists') ||
        rawMsg.includes('duplicate') ||
        rawMsg.includes('unique');

      if (!alreadyExists) {
        return jsonResponse(
          { error: `Error al crear la cuenta del empleado: ${createError?.message ?? 'Error desconocido al crear la cuenta.'}` },
          400,
        );
      }

      const existingId = await findUserByEmail(serviceClient, validated.email);
      if (existingId === null) {
        return jsonResponse(
          { error: 'El correo electrónico ya está registrado en el sistema, pero no se pudo resolver la cuenta existente.' },
          422,
        );
      }
      employeeUserId = existingId;

      // Actualiza la contraseña para que coincida con la ingresada en el modal.
      const { error: updatePwdError } =
        await serviceClient.auth.admin.updateUserById(employeeUserId, {
          password: validated.password,
        });
      if (updatePwdError !== null) {
        return jsonResponse(
          {
            error: `Error al actualizar la contraseña del empleado: ${updatePwdError.message}`,
          },
          400,
        );
      }
    }

    // --- 2. Upsert del perfil ---
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert(
        {
          id: employeeUserId,
          email: validated.email,
          full_name: validated.fullName,
          role: validated.role,
        },
        { onConflict: 'id', ignoreDuplicates: false },
      );
    if (profileError !== null) {
      if (isNewUser) {
        await serviceClient.auth.admin.deleteUser(employeeUserId);
      }
      return jsonResponse(
        { error: `Error al crear el perfil del empleado: ${profileError.message}` },
        400,
      );
    }

    // --- 3. Vinculación con el negocio ---
    // Verificar si ya está vinculado a ESTE negocio.
    const { data: existingStaff } = await serviceClient
      .from('merchant_staff')
      .select('id, is_active')
      .eq('merchant_id', validated.merchantId)
      .eq('user_id', employeeUserId)
      .maybeSingle();

    if (existingStaff !== null) {
      if (existingStaff.is_active) {
        return jsonResponse(
          { error: 'El correo electrónico ya está registrado como empleado activo en este negocio. Si deseas modificar sus permisos, edita su perfil desde la lista de empleados.' },
          409,
        );
      }
      // Estaba desactivado: reactivar con los nuevos permisos.
      const { error: reactivateError } = await serviceClient
        .from('merchant_staff')
        .update({
          is_active: true,
          permissions: validated.permissions,
        })
        .eq('id', existingStaff.id);
      if (reactivateError !== null) {
        return jsonResponse(
          { error: `Error al reactivar al empleado: ${reactivateError.message}` },
          400,
        );
      }
      return jsonResponse({ userId: employeeUserId, staffId: existingStaff.id });
    }

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
    if (staffRow === null || staffError !== null) {
      if (isNewUser) {
        await serviceClient.auth.admin.deleteUser(employeeUserId);
      }
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
