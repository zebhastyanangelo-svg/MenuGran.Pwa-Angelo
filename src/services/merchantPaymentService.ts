import { supabase, TABLE_NAMES } from './supabase';

/** Datos de Pago Móvil configurados por el comercio. */
export interface MerchantPagoMovilInfo {
  bank: string;
  idNumber: string;
  phone: string;
}

interface MerchantPagoMovilRow {
  pago_movil_bank: string | null;
  pago_movil_id_number: string | null;
  pago_movil_phone: string | null;
}

function normalizeText(value: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Mapea una fila de `merchants` a los datos de Pago Móvil normalizados.
 * Devuelve null si alguno de los campos requeridos está vacío o ausente.
 */
export function mapMerchantPagoMovil(
  row: MerchantPagoMovilRow | null,
): MerchantPagoMovilInfo | null {
  if (!row) return null;
  const bank = normalizeText(row.pago_movil_bank);
  const idNumber = normalizeText(row.pago_movil_id_number);
  const phone = normalizeText(row.pago_movil_phone);
  if (!bank || !idNumber || !phone) return null;
  return { bank, idNumber, phone };
}

/**
 * Lee los datos de Pago Móvil de un comercio activo (RLS:
 * `merchants_select_public`). Devuelve null si el comercio no existe,
 * no está activo o no configuró sus datos de Pago Móvil.
 */
export async function fetchMerchantPagoMovil(
  merchantId: string,
): Promise<MerchantPagoMovilInfo | null> {
  if (!merchantId.trim()) return null;

  const { data, error } = await supabase
    .from(TABLE_NAMES.merchants)
    .select('pago_movil_bank, pago_movil_id_number, pago_movil_phone')
    .eq('id', merchantId)
    .maybeSingle();

  if (error) throw error;
  return mapMerchantPagoMovil((data ?? null) as MerchantPagoMovilRow | null);
}
