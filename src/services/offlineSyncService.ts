/**
 * Sincronización diferida de la cola offline hacia Supabase.
 *
 * El repartidor puede perder conexión durante una entrega: las coordenadas
 * del GPS nativo y los cambios de estado se guardan en la cola local
 * (`utils/offlineSyncQueue`) y este servicio los envía a Supabase en
 * segundo plano apenas vuelve la conectividad — sin intervención del
 * usuario y preservando el orden en que ocurrieron.
 */

import { supabase, TABLE_NAMES } from './supabase';
import { dispatchOrderStatusPushToCustomer } from './orderStatusPushService';
import type { OrderStatus } from '../types/database';
import { formatGeoPoint } from '../utils/distance';
import {
  enqueueOfflineEvent,
  getOfflineQueue,
  getOfflineQueueSize,
  isBrowserOffline,
  removeOfflineQueueItems,
  type OfflineQueueItem,
} from '../utils/offlineSyncQueue';

export interface OfflineSyncResult {
  /** Eventos enviados a Supabase y retirados de la cola. */
  syncedItems: number;
  /** Eventos que siguen pendientes (el envío se reintentará). */
  remainingItems: number;
  /** Mensaje del error que cortó el envío, o null si terminó limpio. */
  error: string | null;
}

/**
 * Aplica en Supabase el cambio de estado de una orden y avisa al cliente
 * por Web Push. Es el punto único que usan tanto el envío en línea del
 * panel del repartidor como la sincronización de la cola diferida.
 */
export async function applyOrderStatusToSupabase(
  orderId: string,
  status: OrderStatus,
  driverId?: string | null,
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (driverId !== undefined && driverId !== null) {
    update.driver_id = driverId;
  }
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .update(update)
    .eq('id', orderId);
  if (result.error) throw result.error;
  // Aviso push al cliente (fire-and-forget): el repartidor marcó una novedad
  // y el cliente la recibe por Web Push aunque tenga la app cerrada.
  void dispatchOrderStatusPushToCustomer(orderId, status);
}

/** Persiste la última posición del repartidor en la fila del reparto. */
async function syncDriverLocationItem(
  orderId: string,
  lat: number,
  lng: number,
): Promise<void> {
  // PostgREST exige la cadena (x,y) — x=longitud, y=latitud — para POINT.
  const currentLocation = formatGeoPoint({ x: lng, y: lat });
  const result = await supabase
    .from(TABLE_NAMES.deliveries)
    .update({ current_location: currentLocation })
    .eq('order_id', orderId);
  if (result.error) throw result.error;
  // 0 filas (sin reparto creado aún) también cuenta como sincronizado:
  // no hay dónde dejar la posición y reintentar lo único que lograría es
  // una cola que nunca se vacía.
}

async function syncQueueItem(item: OfflineQueueItem): Promise<void> {
  if (item.event.type === 'driver_location') {
    await syncDriverLocationItem(
      item.event.orderId,
      item.event.lat,
      item.event.lng,
    );
    return;
  }
  await applyOrderStatusToSupabase(
    item.event.orderId,
    item.event.status,
    item.event.driverId,
  );
}

/**
 * Envía a Supabase todos los eventos pendientes de la cola offline, en
 * orden cronológico. Al primer fallo (p. ej. la conexión volvió a caerse)
 * se detiene y los eventos restantes quedan en cola para el próximo
 * intento, preservando la secuencia de estados de la entrega.
 */
export async function flushOfflineQueue(): Promise<OfflineSyncResult> {
  const items = await getOfflineQueue();
  if (items.length === 0) {
    return { syncedItems: 0, remainingItems: 0, error: null };
  }

  const syncedIds: string[] = [];
  let failure: string | null = null;

  for (const item of items) {
    try {
      await syncQueueItem(item);
      syncedIds.push(item.id);
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Error de sincronización offline';
      break;
    }
  }

  if (syncedIds.length > 0) {
    await removeOfflineQueueItems(syncedIds);
  }

  return {
    syncedItems: syncedIds.length,
    remainingItems: items.length - syncedIds.length,
    error: failure,
  };
}

/**
 * Registra el cambio de estado de una entrega: en línea lo aplica ya en
 * Supabase; sin conexión lo encola para sincronización diferida (el
 * llamador puede aplicar el cambio optimista en la UI).
 *
 * @throws si la cola local tampoco pudo persistir el cambio.
 */
export async function persistOrderStatus(
  orderId: string,
  status: OrderStatus,
  driverId?: string | null,
): Promise<void> {
  if (!isBrowserOffline()) {
    await applyOrderStatusToSupabase(orderId, status, driverId);
    return;
  }
  const queued = await enqueueOfflineEvent({
    type: 'delivery_status',
    orderId,
    status,
    driverId: driverId ?? null,
    recordedAt: Date.now(),
  });
  if (queued === null) {
    throw new Error(
      'Sin conexión: no se pudo guardar el cambio localmente. Verifica el almacenamiento del dispositivo.',
    );
  }
}

let syncListenerRegistered = false;

/**
 * Programa la sincronización automática de la cola: escucha el evento
 * `online` del navegador para vaciarla apenas se restablezca la
 * conectividad y, si la app arranca con conexión, intenta un envío
 * inmediato de lo pendiente de sesiones anteriores.
 *
 * Es idempotente: puede llamarse desde varios hooks sin duplicar el
 * listener.
 */
export function scheduleOfflineSync(): void {
  if (typeof window === 'undefined' || syncListenerRegistered) {
    return;
  }
  syncListenerRegistered = true;

  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });

  if (!isBrowserOffline()) {
    void getOfflineQueueSize().then((size) => {
      if (size > 0) {
        void flushOfflineQueue();
      }
    });
  }
}
