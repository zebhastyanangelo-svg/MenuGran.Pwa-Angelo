import { supabase, TABLE_NAMES } from './supabase';
import type {
  IsoTimestamp,
  MerchantInsert,
  MerchantStatus,
  ProfileUpdate,
} from '../types/database';
import {
  slugifyMerchantName,
  validateCreateMerchantInput,
  type CreateMerchantAccountInput,
  type CreateMerchantAccountResult,
} from '../utils/merchantRegistration';

export interface MerchantAccountListItem {
  id: string;
  name: string;
  rif: string;
  status: MerchantStatus;
  is_active: boolean;
  created_at: IsoTimestamp;
  owner_id: string | null;
  owner_email: string | null;
  owner_full_name: string | null;
}

interface MerchantListQueryRow {
  id: string;
  name: string;
  rif: string;
  status: MerchantStatus;
  is_active: boolean;
  created_at: IsoTimestamp;
  owner_id: string | null;
  profiles: { email: string; full_name: string | null } | null;
}

/**
 * Crea la cuenta completa de un comercio desde el panel de Super Admin:
 * 1. Invoca el Edge Function `create-merchant`, que —con la service_role
 *    key solo en el servidor y tras verificar que el llamador es superadmin—
 *    registra al propietario auto-confirmado con su email, la contraseña
 *    inicial definida en el formulario y rol `merchant_owner`.
 * 2. Asigna el rol `merchant_owner` en su perfil.
 * 3. Inserta el merchant activo vinculado a ese usuario, con el nombre
 *    público del negocio, para que MerchantDashboardPage detecte la tienda.
 *
 * La llamada usa las credenciales cliente normales: la service_role key
 * nunca llega al frontend.
 */
export async function createMerchantAccount(
  input: CreateMerchantAccountInput,
): Promise<CreateMerchantAccountResult> {
  const validationError = validateCreateMerchantInput(input);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const userId = await createConfirmedOwner(input);
  await assignOwnerRole(userId, input.ownerFullName, input.ownerCi);
  const merchantId = await insertActiveMerchant(userId, input);

  return { userId, merchantId, temporaryPassword: input.ownerPassword };
}

async function createConfirmedOwner(
  input: CreateMerchantAccountInput,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-merchant', {
    body: {
      email: input.ownerEmail.trim(),
      password: input.ownerPassword,
      fullName: input.ownerFullName.trim(),
    },
  });
  if (error !== null) {
    throw new Error(extractFunctionErrorMessage(error));
  }
  const userId = readUserIdFromPayload(data);
  if (userId === null) {
    throw new Error('No se pudo crear la cuenta del propietario.');
  }
  return userId;
}

function extractFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== '') {
    return `Error al crear la cuenta del propietario: ${error.message}`;
  }
  return 'Error al crear la cuenta del propietario.';
}

function readUserIdFromPayload(payload: unknown): string | null {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'userId' in payload &&
    typeof (payload as { userId: unknown }).userId === 'string'
  ) {
    return (payload as { userId: string }).userId;
  }
  return null;
}

async function assignOwnerRole(
  userId: string,
  fullName: string,
  ci: string,
): Promise<void> {
  const updates: ProfileUpdate = {
    role: 'merchant_owner',
    full_name: fullName.trim(),
    ci: ci.trim(),
  };
  const { error } = await supabase
    .from(TABLE_NAMES.profiles)
    .update(updates)
    .eq('id', userId)
    .single();
  if (error !== null && !isNoRowsError(error)) {
    throw new Error(`Error al asignar el rol merchant_owner: ${error.message}`);
  }
}

function isNoRowsError(error: { code?: string }): boolean {
  return error.code === 'PGRST116';
}

async function insertActiveMerchant(
  ownerId: string,
  input: CreateMerchantAccountInput,
): Promise<string> {
  const payload = buildMerchantPayload(ownerId, input);
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .insert(payload as Partial<MerchantInsert>)
    .select('id')
    .single();
  if (error !== null || data === null) {
    throw new Error(
      `Error al crear el comercio: ${error?.message ?? 'sin datos'}`,
    );
  }
  return data.id;
}

function buildMerchantPayload(
  ownerId: string,
  input: CreateMerchantAccountInput,
): Partial<MerchantInsert> & Pick<MerchantInsert, 'owner_id' | 'name'> {
  return {
    owner_id: ownerId,
    name: input.businessName.trim(),
    slug: slugifyMerchantName(input.businessName),
    rif: input.businessRif.trim(),
    category: 'Otro',
    description: null,
    address: '',
    zone: null,
    phone_whatsapp: input.ownerPhone.trim(),
    service_modalities: ['Delivery'],
    business_hours: {
      days: 'Lunes a Domingo',
      open_time: '08:00',
      close_time: '20:00',
    },
    status: 'active',
    is_active: true,
    is_open: true,
  };
}

/**
 * Elimina completamente un comercio y la cuenta de su propietario invocando
 * el Edge Function `delete-merchant`, que —con la service_role key solo en
 * el servidor y tras verificar que el llamador es superadmin— borra la fila
 * del merchant, su perfil y al propietario en Supabase Auth.
 */
export async function deleteMerchant(
  merchantId: string,
  ownerId: string,
): Promise<void> {
  if (merchantId.trim() === '' || ownerId.trim() === '') {
    throw new Error(
      'Se requiere el identificador del comercio y del propietario.',
    );
  }
  const { error } = await supabase.functions.invoke('delete-merchant', {
    body: { merchantId, ownerId },
  });
  if (error !== null) {
    throw new Error(extractDeleteMerchantErrorMessage(error));
  }
}

function extractDeleteMerchantErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== '') {
    return `Error al eliminar el comercio: ${error.message}`;
  }
  return 'Error al eliminar el comercio.';
}

/** Lista los comercios existentes junto a los datos de su propietario. */
export async function listMerchantsWithOwners(): Promise<
  MerchantAccountListItem[]
> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select(
      'id, owner_id, name, rif, status, is_active, created_at, profiles(email, full_name)',
    )
    .order('created_at', { ascending: false });

  if (error !== null) {
    throw new Error(`Error al listar los comercios: ${error.message}`);
  }

  return ((data ?? []) as unknown as MerchantListQueryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    rif: row.rif,
    status: row.status,
    is_active: row.is_active,
    created_at: row.created_at,
    owner_id: row.owner_id ?? null,
    owner_email: row.profiles?.email ?? null,
    owner_full_name: row.profiles?.full_name ?? null,
  }));
}
