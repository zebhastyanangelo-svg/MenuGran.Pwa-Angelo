/**
 * Servicio de gestión de tramos de tarifa de delivery por distancia.
 *
 * Cada comercio define sus propios tramos (min_km, max_km] con un monto fijo.
 * El checkout consulta estos tramos para calcular el costo de envío según la
 * distancia real entre el comercio y la dirección del cliente.
 */
import { supabase, TABLE_NAMES } from './supabase';
import type { DeliveryFeeTierRow } from '../types/database';

export interface DeliveryFeeTierInput {
  minKm: number;
  maxKm: number;
  fee: number;
}

export async function fetchDeliveryFeeTiers(
  merchantId: string,
): Promise<DeliveryFeeTierRow[]> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.deliveryFeeTiers)
    .select('*')
    .eq('merchant_id', merchantId)
    .order('min_km', { ascending: true });

  if (error) {
    throw new Error(
      `Error al cargar los tramos de tarifa: ${error.message}`,
    );
  }

  return (data ?? []) as DeliveryFeeTierRow[];
}

export async function createDeliveryFeeTier(
  merchantId: string,
  input: DeliveryFeeTierInput,
): Promise<DeliveryFeeTierRow> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.deliveryFeeTiers)
    .insert({
      merchant_id: merchantId,
      min_km: input.minKm,
      max_km: input.maxKm,
      fee: input.fee,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error al crear el tramo de tarifa: ${error.message}`,
    );
  }

  return data as DeliveryFeeTierRow;
}

export async function updateDeliveryFeeTier(
  merchantId: string,
  tierId: string,
  input: DeliveryFeeTierInput,
): Promise<DeliveryFeeTierRow> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.deliveryFeeTiers)
    .update({
      min_km: input.minKm,
      max_km: input.maxKm,
      fee: input.fee,
    })
    .eq('id', tierId)
    .eq('merchant_id', merchantId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error al actualizar el tramo de tarifa: ${error.message}`,
    );
  }

  return data as DeliveryFeeTierRow;
}

export async function deleteDeliveryFeeTier(
  merchantId: string,
  tierId: string,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAMES.deliveryFeeTiers)
    .delete()
    .eq('id', tierId)
    .eq('merchant_id', merchantId);

  if (error) {
    throw new Error(
      `Error al eliminar el tramo de tarifa: ${error.message}`,
    );
  }
}
