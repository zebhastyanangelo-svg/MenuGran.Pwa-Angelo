import { supabase, TABLE_NAMES } from './supabase';
import type { OrderRow } from '../types/database';

/**
 * Confirma la entrega del pedido por parte del cliente.
 *
 * Ejecuta el UPDATE explícito a `status = 'delivered'` y verifica que la
 * fila realmente se haya actualizado: con RLS, un UPDATE sin permisos
 * devuelve 0 filas sin error, por lo que hay que comprobar `data`.
 *
 * @throws Error si la orden no existe, no pertenece al cliente o RLS
 *         bloqueó la actualización.
 */
export async function confirmOrderDelivery(orderId: string): Promise<OrderRow> {
  if (!orderId) {
    throw new Error('ID de orden no proporcionado');
  }

  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .update({ status: 'delivered' })
    .eq('id', orderId)
    .select('*');

  if (error) throw error;

  const updated = data?.[0] ?? null;
  if (!updated || updated.status !== 'delivered') {
    throw new Error('No se pudo confirmar la entrega en el servidor.');
  }

  return updated as unknown as OrderRow;
}
