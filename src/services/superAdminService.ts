import type { Session } from '@supabase/supabase-js';
import { supabase, TABLE_NAMES } from './supabase';
import type {
  IsoTimestamp,
  MerchantInsert,
  MerchantStatus,
  ProfileUpdate,
} from '../types/database';
import {
  generateTemporaryPassword,
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
  profiles: { email: string; full_name: string | null } | null;
}

/**
 * Crea la cuenta completa de un comercio desde el panel de Super Admin:
 * 1. Registra al propietario en Supabase Auth usando su email como usuario.
 * 2. Asigna el rol `merchant_owner` en su perfil.
 * 3. Inserta el merchant activo vinculado a ese usuario, con el nombre
 *    público del negocio, para que MerchantDashboardPage detecte la tienda.
 * Al finalizar restaura la sesión previa del Super Admin.
 */
export async function createMerchantAccount(
  input: CreateMerchantAccountInput,
): Promise<CreateMerchantAccountResult> {
  const validationError = validateCreateMerchantInput(input);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const previousSession = await readCurrentSession();
  const temporaryPassword = generateTemporaryPassword();
  const userId = await signUpOwner(input, temporaryPassword);
  await assignOwnerRole(userId, input.ownerFullName, input.ownerCi);
  const merchantId = await insertActiveMerchant(userId, input);

  await restoreSession(previousSession);

  return { userId, merchantId, temporaryPassword };
}

async function readCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

async function signUpOwner(
  input: CreateMerchantAccountInput,
  temporaryPassword: string,
): Promise<string> {
  const { data, error } = await supabase.auth.signUp({
    email: input.ownerEmail.trim(),
    password: temporaryPassword,
    options: {
      data: {
        full_name: input.ownerFullName.trim(),
        role: 'merchant_owner',
      },
    },
  });
  if (error !== null) {
    throw new Error(`Error al crear la cuenta del propietario: ${error.message}`);
  }
  if (data.user === null) {
    throw new Error('No se pudo crear la cuenta del propietario.');
  }
  return data.user.id;
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

async function restoreSession(session: Session | null): Promise<void> {
  if (session === null) return;
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error !== null) {
    console.error(
      'No se pudo restaurar la sesión del Super Admin',
      error.message,
    );
  }
}

/** Lista los comercios existentes junto a los datos de su propietario. */
export async function listMerchantsWithOwners(): Promise<
  MerchantAccountListItem[]
> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select(
      'id, name, rif, status, is_active, created_at, profiles(email, full_name)',
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
    owner_email: row.profiles?.email ?? null,
    owner_full_name: row.profiles?.full_name ?? null,
  }));
}
