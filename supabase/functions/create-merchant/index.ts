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
  ownerCi?: unknown;
  ownerPhone?: unknown;
  businessName?: unknown;
  businessRif?: unknown;
}

interface ValidatedCreateMerchantPayload {
  email: string;
  password: string;
  fullName: string;
  ownerCi: string;
  ownerPhone: string;
  businessName: string;
  businessRif: string;
}

type ValidationResult =
  | { error: string; field: string }
  | ValidatedCreateMerchantPayload;

type ServiceClient = ReturnType<typeof buildServiceRoleClient>;
type OperationResult =
  | { value: string }
  | { error: string; status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validatePayload(payload: CreateMerchantPayload): ValidationResult {
  const email = readString(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName = readString(payload.fullName);
  const ownerCi = readString(payload.ownerCi);
  const ownerPhone = readString(payload.ownerPhone);
  const businessName = readString(payload.businessName);
  const businessRif = readString(payload.businessRif);
  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Ingresa un email válido para el propietario.', field: 'email' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, field: 'password' };
  }
  if (fullName === '' || ownerCi === '' || ownerPhone === '') {
    return { error: 'Completa los datos del propietario.', field: 'owner' };
  }
  if (businessName === '' || businessRif === '') {
    return { error: 'Completa los datos del comercio.', field: 'business' };
  }
  return { email, password, fullName, ownerCi, ownerPhone, businessName, businessRif };
}

function slugifyMerchantName(name: string): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug === '' ? 'comercio' : slug;
}

async function createOwnerUser(
  serviceClient: ServiceClient,
  payload: ValidatedCreateMerchantPayload,
): Promise<OperationResult> {
  const { data, error } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName, role: 'merchant_owner' },
    app_metadata: { role: 'merchant_owner' },
  });
  if (error !== null) {
    return { error: `Error al crear la cuenta del propietario: ${error.message}`, status: 400 };
  }
  if (data.user === null) return { error: 'No se pudo crear la cuenta del propietario.', status: 500 };
  return { value: data.user.id };
}

async function updateOwnerProfile(
  serviceClient: ServiceClient,
  userId: string,
  payload: ValidatedCreateMerchantPayload,
): Promise<OperationResult> {
  const { error } = await serviceClient.from('profiles').upsert({
    id: userId,
    email: payload.email,
    full_name: payload.fullName,
    ci: payload.ownerCi,
    phone: payload.ownerPhone,
    role: 'merchant_owner',
  }, { onConflict: 'id' });
  if (error !== null) return { error: `Error al asignar el perfil: ${error.message}`, status: 400 };
  return { value: userId };
}

async function insertMerchant(
  serviceClient: ServiceClient,
  userId: string,
  payload: ValidatedCreateMerchantPayload,
): Promise<OperationResult> {
  const { data, error } = await serviceClient.from('merchants').insert({
    owner_id: userId,
    name: payload.businessName,
    slug: slugifyMerchantName(payload.businessName),
    rif: payload.businessRif,
    category: 'Otro',
    description: null,
    address: '',
    zone: null,
    phone_whatsapp: payload.ownerPhone,
    service_modalities: ['Delivery'],
    business_hours: { days: 'Lunes a Domingo', open_time: '08:00', close_time: '20:00' },
    status: 'active',
    is_active: true,
    is_open: true,
  }).select('id').single();
  if (error !== null || data === null) {
    return { error: `Error al crear el comercio: ${error?.message ?? 'sin datos'}`, status: 400 };
  }
  return { value: data.id };
}

async function deleteCreatedUser(serviceClient: ServiceClient, userId: string): Promise<void> {
  await serviceClient.auth.admin.deleteUser(userId);
}

async function createMerchant(
  serviceClient: ServiceClient,
  payload: ValidatedCreateMerchantPayload,
): Promise<{ userId: string; merchantId: string } | { error: string; status: number }> {
  const owner = await createOwnerUser(serviceClient, payload);
  if ('error' in owner) return owner;
  const profile = await updateOwnerProfile(serviceClient, owner.value, payload);
  if ('error' in profile) {
    await deleteCreatedUser(serviceClient, owner.value);
    return profile;
  }
  const merchant = await insertMerchant(serviceClient, owner.value, payload);
  if ('error' in merchant) {
    await deleteCreatedUser(serviceClient, owner.value);
    return merchant;
  }
  return { userId: owner.value, merchantId: merchant.value };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authResult = await assertSuperadmin(req.headers.get('Authorization'));
  if (!authResult.ok) return authResult.response;

  let payload: CreateMerchantPayload;
  try {
    payload = (await req.json()) as CreateMerchantPayload;
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }
  const validated = validatePayload(payload);
  if ('error' in validated) return jsonResponse(validated, 400);

  try {
    const result = await createMerchant(buildServiceRoleClient(), validated);
    if ('error' in result) return jsonResponse({ error: result.error }, result.status);
    return jsonResponse(result);
  } catch {
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
  }
});
