import {
  assertAuthenticated,
  buildServiceRoleClient,
  corsHeaders,
  jsonResponse,
} from '../_shared/superadmin-guard.ts';

interface CreateEmployeePayload {
  merchantId?: unknown;
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  role?: unknown;
  permissions?: unknown;
}

type StaffRole = 'merchant_staff' | 'driver';
type ServiceClient = ReturnType<typeof buildServiceRoleClient>;
type ValidationResult =
  | { error: string }
  | {
      merchantId: string;
      email: string;
      password: string;
      fullName: string;
      role: StaffRole;
      permissions: Record<string, boolean>;
    };

type ExistingStaff = { id: string; is_active: boolean };
type UserResolution =
  | { userId: string; isNewUser: boolean; existingStaff: ExistingStaff | null }
  | { error: string; status: number };
type PersistResult = { error: string; status: number } | null;
type LinkResult = { staffId: string } | { error: string; status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const STAFF_ROLES: readonly string[] = ['merchant_staff', 'driver'];

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRole(value: unknown): StaffRole | null {
  if (value === undefined) return 'merchant_staff';
  return typeof value === 'string' && STAFF_ROLES.includes(value)
    ? (value as StaffRole)
    : null;
}

function parsePermissions(value: unknown, role: StaffRole): Record<string, boolean> {
  const raw = value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  if (role === 'driver') {
    return {
      can_manage_orders: false,
      can_manage_menu: false,
      can_view_orders: true,
      can_manage_settings: false,
      can_view_metrics: false,
      can_view_assigned_deliveries: true,
    };
  }
  return {
    can_manage_orders: raw.can_manage_orders === true,
    can_manage_menu: raw.can_manage_menu === true,
    can_view_orders: raw.can_view_orders !== false,
    can_manage_settings: raw.can_manage_settings === true,
    can_view_metrics: raw.can_view_metrics === true,
    can_view_assigned_deliveries: raw.can_view_assigned_deliveries === true,
  };
}

function validatePayload(payload: CreateEmployeePayload): ValidationResult {
  const merchantId = readString(payload.merchantId);
  const email = readString(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName = readString(payload.fullName);
  const role = parseRole(payload.role);
  if (merchantId === '') return { error: 'Se requiere el identificador del comercio.' };
  if (!EMAIL_PATTERN.test(email)) return { error: 'Ingresa un email válido para el empleado.' };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (fullName === '' || role === null) return { error: 'Completa los datos del empleado.' };
  return {
    merchantId,
    email,
    password,
    fullName,
    role,
    permissions: parsePermissions(payload.permissions, role),
  };
}

async function canManageMerchant(
  serviceClient: ServiceClient,
  userId: string,
  merchantId: string,
): Promise<boolean> {
  const owner = await serviceClient
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .eq('owner_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (owner.data !== null) return true;
  const profile = await serviceClient.from('profiles').select('role').eq('id', userId).maybeSingle();
  return profile.data?.role === 'superadmin';
}

async function findUserByEmail(
  serviceClient: ServiceClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await serviceClient.auth.admin.listUsers({ filters: { email } });
  if (error !== null || data?.users === undefined) return null;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

function isAlreadyRegistered(message: string): boolean {
  const normalized = message.toLowerCase();
  return ['already', 'registered', 'exists', 'duplicate', 'unique'].some(
    (value) => normalized.includes(value),
  );
}

async function getExistingStaff(
  serviceClient: ServiceClient,
  merchantId: string,
  userId: string,
): Promise<ExistingStaff | null> {
  const { data, error } = await serviceClient
    .from('merchant_staff')
    .select('id, is_active')
    .eq('merchant_id', merchantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error !== null) {
    throw new Error('No se pudo verificar el vínculo del empleado.');
  }
  return data;
}

async function resolveEmployeeUser(
  serviceClient: ServiceClient,
  payload: Extract<ValidationResult, { merchantId: string }>,
): Promise<UserResolution> {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName, role: payload.role },
    app_metadata: { role: payload.role },
  });
  if (error === null && data.user !== null) {
    return { userId: data.user.id, isNewUser: true, existingStaff: null };
  }
  if (error === null || !isAlreadyRegistered(error.message)) {
    return { error: `Error al crear la cuenta del empleado: ${error?.message ?? 'error desconocido'}`, status: 400 };
  }
  const userId = await findUserByEmail(serviceClient, payload.email);
  if (userId === null) {
    return { error: 'No se pudo resolver la cuenta existente.', status: 422 };
  }
  const profile = await serviceClient.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile.data?.role === 'superadmin' || profile.data?.role === 'merchant_owner') {
    return { error: 'El correo pertenece a una cuenta administrativa.', status: 409 };
  }
  const existingStaff = await getExistingStaff(serviceClient, payload.merchantId, userId);
  if (existingStaff === null) {
    return { error: 'El correo ya pertenece a una cuenta sin vínculo con este comercio.', status: 409 };
  }
  if (existingStaff.is_active) {
    return { error: 'El empleado ya está activo en este comercio.', status: 409 };
  }
  return { userId, isNewUser: false, existingStaff };
}

async function upsertEmployeeProfile(
  serviceClient: ServiceClient,
  userId: string,
  payload: Extract<ValidationResult, { merchantId: string }>,
): Promise<PersistResult> {
  const { error } = await serviceClient.from('profiles').upsert({
    id: userId,
    email: payload.email,
    full_name: payload.fullName,
    role: payload.role,
  }, { onConflict: 'id' });
  return error === null ? null : { error: error.message, status: 400 };
}

async function linkEmployee(
  serviceClient: ServiceClient,
  userId: string,
  payload: Extract<ValidationResult, { merchantId: string }>,
  existingStaff: ExistingStaff | null,
): Promise<LinkResult> {
  if (existingStaff !== null) {
    const { error } = await serviceClient.from('merchant_staff').update({
      is_active: true,
      permissions: payload.permissions,
      role: payload.role,
    }).eq('id', existingStaff.id);
    return error === null
      ? { staffId: existingStaff.id }
      : { error: error.message, status: 400 };
  }
  const { data, error } = await serviceClient.from('merchant_staff').insert({
    merchant_id: payload.merchantId,
    user_id: userId,
    permissions: payload.permissions,
    role: payload.role,
    is_active: true,
  }).select('id').single();
  return error === null && data !== null
    ? { staffId: data.id }
    : { error: error?.message ?? 'No se pudo vincular al empleado.', status: 400 };
}

async function deleteNewUser(serviceClient: ServiceClient, userId: string): Promise<void> {
  await serviceClient.auth.admin.deleteUser(userId);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authResult = await assertAuthenticated(req.headers.get('Authorization'));
  if (!authResult.ok) return authResult.response;

  let payload: CreateEmployeePayload;
  try {
    payload = (await req.json()) as CreateEmployeePayload;
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }
  const validated = validatePayload(payload);
  if ('error' in validated) return jsonResponse(validated, 400);

  try {
    const serviceClient = buildServiceRoleClient();
    if (!(await canManageMerchant(serviceClient, authResult.userId, validated.merchantId))) {
      return jsonResponse({ error: 'No tienes permisos para administrar este comercio.' }, 403);
    }
    const user = await resolveEmployeeUser(serviceClient, validated);
    if ('error' in user) return jsonResponse({ error: user.error }, user.status);
    const profileError = await upsertEmployeeProfile(serviceClient, user.userId, validated);
    if (profileError !== null) {
      if (user.isNewUser) await deleteNewUser(serviceClient, user.userId);
      return jsonResponse({ error: profileError.error }, profileError.status);
    }
    const link = await linkEmployee(serviceClient, user.userId, validated, user.existingStaff);
    if ('error' in link) {
      if (user.isNewUser) await deleteNewUser(serviceClient, user.userId);
      return jsonResponse({ error: link.error }, link.status);
    }
    return jsonResponse({ userId: user.userId, staffId: link.staffId });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
