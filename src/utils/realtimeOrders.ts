import type { OrderRow, OrderStatus } from '../types/database';
import { ORDER_STATUS_ORDER } from './orderStatus';

export type RealtimeOrderUpdate = Partial<OrderRow> & Pick<OrderRow, 'id'>;

interface PostgresChangesEnvelope {
  new?: Record<string, unknown> | null;
}

export function parseRealtimeOrderUpdate(
  payload: unknown,
): RealtimeOrderUpdate | null {
  try {
    if (typeof payload !== 'object' || payload === null) return null;
    const row = (payload as PostgresChangesEnvelope).new;
    if (typeof row !== 'object' || row === null) return null;
    const id = row.id;
    const status = row.status;
    if (typeof id !== 'string' || id.length === 0) return null;
    if (
      status !== undefined &&
      !ORDER_STATUS_ORDER.includes(status as OrderStatus)
    ) {
      return null;
    }
    return row as unknown as RealtimeOrderUpdate;
  } catch {
    return null;
  }
}

export function mergeRealtimeOrderUpdate<T extends { id: string }>(
  orders: readonly T[],
  update: RealtimeOrderUpdate,
): T[] {
  const index = orders.findIndex((order) => order.id === update.id);
  if (index === -1) {
    return orders as T[];
  }
  const next = orders.slice();
  next[index] = { ...next[index], ...update } as T;
  return next;
}
