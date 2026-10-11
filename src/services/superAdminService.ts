import { supabase, TABLE_NAMES } from './supabase';
import type {
  BusinessHours,
  IsoTimestamp,
  MerchantCategory,
  MerchantStatus,
  ServiceModality,
} from '../types/database';
import {
  getAuthenticatedFunctionHeaders,
  readFunctionError,
} from './edgeFunctions';
import {
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

interface CreateMerchantResponse {
  userId?: unknown;
  merchantId?: unknown;
}

export async function createMerchantAccount(
  input: CreateMerchantAccountInput,
): Promise<CreateMerchantAccountResult> {
  const validationError = validateCreateMerchantInput(input);
  if (validationError !== null) throw new Error(validationError);

  const headers = await getAuthenticatedFunctionHeaders();
  const { data, error, response } =
    await supabase.functions.invoke<CreateMerchantResponse>('create-merchant', {
      headers,
      body: {
        email: input.ownerEmail.trim(),
        password: input.ownerPassword,
        fullName: input.ownerFullName.trim(),
        ownerCi: input.ownerCi.trim(),
        ownerPhone: input.ownerPhone.trim(),
        businessName: input.businessName.trim(),
        businessRif: input.businessRif.trim(),
      },
    });
  if (error !== null) {
    throw new Error(await formatFunctionError('crear la cuenta del propietario', error, response));
  }

  const result = readCreateMerchantResult(data);
  if (result === null) throw new Error('No se pudo crear el comercio.');
  return {
    userId: result.userId,
    merchantId: result.merchantId,
    temporaryPassword: input.ownerPassword,
  };
}

function readCreateMerchantResult(
  payload: CreateMerchantResponse | null,
): { userId: string; merchantId: string } | null {
  if (
    payload === null ||
    typeof payload.userId !== 'string' ||
    typeof payload.merchantId !== 'string' ||
    payload.userId === '' ||
    payload.merchantId === ''
  ) {
    return null;
  }
  return { userId: payload.userId, merchantId: payload.merchantId };
}

async function formatFunctionError(
  action: string,
  error: unknown,
  response: Response | undefined,
): Promise<string> {
  const serverMessage = await readFunctionError(response);
  if (serverMessage !== null) return `Error al ${action}: ${serverMessage}`;
  if (error instanceof Error && error.message !== '') {
    return `Error al ${action}: ${error.message}`;
  }
  return `Error al ${action}.`;
}

export async function deleteMerchant(
  merchantId: string,
  ownerId: string,
): Promise<void> {
  if (merchantId.trim() === '' || ownerId.trim() === '') {
    throw new Error('Se requiere el identificador del comercio y del propietario.');
  }
  const headers = await getAuthenticatedFunctionHeaders();
  const { error, response } = await supabase.functions.invoke('delete-merchant', {
    headers,
    body: { merchantId, ownerId },
  });
  if (error !== null) {
    throw new Error(await formatFunctionError('eliminar el comercio', error, response));
  }
}

export async function listMerchantsWithOwners(): Promise<
  MerchantAccountListItem[]
> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id, owner_id, name, rif, status, is_active, created_at, profiles(email, full_name)')
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

/** Información pública y administrativa de un comercio (sin métricas financieras). */
export interface MerchantDetails {
  id: string;
  name: string;
  slug: string;
  rif: string;
  status: MerchantStatus;
  is_active: boolean;
  is_open: boolean;
  category: MerchantCategory;
  description: string | null;
  address: string;
  zone: string | null;
  phone_whatsapp: string;
  service_modalities: ServiceModality;
  business_hours: BusinessHours;
  opening_time: string | null;
  closing_time: string | null;
  created_at: IsoTimestamp;
}

const MERCHANT_DETAILS_COLUMNS =
  'id, name, slug, rif, status, is_active, is_open, category, description, address, zone, phone_whatsapp, service_modalities, business_hours, opening_time, closing_time, created_at';

/**
 * Obtiene la ficha completa de un comercio para el panel de Super Admin.
 *
 * Solo lectura: respeta las políticas RLS y no consulta datos financieros
 * (ingresos, pedidos) — esos viven en el modal de métricas.
 */
export async function fetchMerchantDetails(
  merchantId: string,
): Promise<MerchantDetails> {
  if (merchantId.trim() === '') {
    throw new Error('Se requiere el identificador del comercio.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select(MERCHANT_DETAILS_COLUMNS)
    .eq('id', merchantId)
    .maybeSingle();

  if (error !== null) {
    throw new Error(`Error al obtener el comercio: ${error.message}`);
  }
  if (data === null) {
    throw new Error('No se encontró el comercio.');
  }
  return data as MerchantDetails;
}
