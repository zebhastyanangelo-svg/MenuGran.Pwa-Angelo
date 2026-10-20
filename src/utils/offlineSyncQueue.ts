/**
 * Cola offline para sincronización diferida con Supabase.
 *
 * Cuando el repartidor pierde conexión a internet, el GPS nativo del
 * dispositivo sigue funcionando (`navigator.geolocation` es independiente de
 * la red): esta cola guarda temporalmente las coordenadas y los estados de
 * entrega que no pudieron enviarse, para sincronizarlos en segundo plano
 * apenas se restablezca la conectividad.
 *
 * Almacenamiento: IndexedDB como vía principal (asíncrono, gran capacidad y
 * sin límite de tamaño práctico) con respaldo automático en localStorage
 * para entornos sin IndexedDB (SSR, navegadores antiguos, jsdom).
 *
 * Convenciones del proyecto: guards SSR, try/catch explícito en toda función
 * pública y tope de entradas para evitar crecimiento ilimitado.
 */

import type { OrderStatus } from '../types/database';

/** Coordenada del repartidor capturada por el GPS mientras estaba offline. */
export interface OfflineDriverLocationEvent {
  type: 'driver_location';
  orderId: string;
  lat: number;
  lng: number;
  /** Momento (epoch ms) en que el GPS reportó la posición. */
  recordedAt: number;
}

/** Cambio de estado de entrega que no pudo aplicarse en Supabase. */
export interface OfflineDeliveryStatusEvent {
  type: 'delivery_status';
  orderId: string;
  status: OrderStatus;
  /** Repartidor que tomó la entrega; ausente en cambios sin asignación. */
  driverId?: string | null;
  /** Momento (epoch ms) en que el repartidor marcó el cambio. */
  recordedAt: number;
}

export type OfflineQueueEvent =
  | OfflineDriverLocationEvent
  | OfflineDeliveryStatusEvent;

/** Evento persistido en la cola, con identidad y orden de inserción. */
export interface OfflineQueueItem {
  id: string;
  event: OfflineQueueEvent;
  createdAt: number;
}

const DB_NAME = 'menugran-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'events';
const LOCAL_STORAGE_KEY = 'menugran_offline_queue_v1';
/** Tope de la cola: al superarlo se descartan los eventos más viejos. */
const MAX_QUEUE_ITEMS = 200;

/** Reloj monotónico de la cola: garantiza orden estable ante ticks simultáneos. */
let lastCreatedAt = 0;

function nextCreatedAt(): number {
  const now = Date.now();
  lastCreatedAt = now > lastCreatedAt ? now : lastCreatedAt + 1;
  return lastCreatedAt;
}

function createQueueItemId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Algunos entornos restringen `crypto`; se cae al generador manual.
  }
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** ¿El navegador reporta que NO hay conexión a internet? */
export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function isLocalStorageAvailable(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const testKey = '__menugran_queue_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------- Vía principal: IndexedDB ------------------------ */

function openQueueDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('No se pudo abrir la cola offline.'));
      };
      request.onblocked = () => {
        reject(new Error('La base de datos de la cola offline está bloqueada.'));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error('IndexedDB no está disponible.'));
    }
  });
}

async function readIndexedDbItems(): Promise<OfflineQueueItem[]> {
  const db = await openQueueDatabase();
  try {
    return await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve((request.result ?? []) as OfflineQueueItem[]);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('No se pudo leer la cola offline.'));
      };
    });
  } finally {
    db.close();
  }
}

async function writeIndexedDbItems(items: readonly OfflineQueueItem[]): Promise<void> {
  const db = await openQueueDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('No se pudo escribir la cola offline.'));
      };
    });
  } finally {
    db.close();
  }
}

/* ----------------------- Respaldo: localStorage ---------------------------- */

function readLocalStorageItems(): OfflineQueueItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === null) {
      return [];
    }
    const parsed = JSON.parse(stored) as { items?: unknown };
    if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      return [];
    }
    return parsed.items.filter(
      (item): item is OfflineQueueItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as OfflineQueueItem).id === 'string',
    );
  } catch {
    return [];
  }
}

function writeLocalStorageItems(items: readonly OfflineQueueItem[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ items }));
}

/* --------------------------- Operaciones comunes --------------------------- */

async function readAllItems(): Promise<OfflineQueueItem[]> {
  const items = isIndexedDbAvailable()
    ? await readIndexedDbItems()
    : isLocalStorageAvailable()
      ? readLocalStorageItems()
      : [];
  return items.filter(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      item.event !== null &&
      typeof item.event === 'object',
  );
}

async function writeAllItems(items: readonly OfflineQueueItem[]): Promise<boolean> {
  try {
    if (isIndexedDbAvailable()) {
      await writeIndexedDbItems(items);
      return true;
    }
    if (isLocalStorageAvailable()) {
      writeLocalStorageItems(items);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isValidOfflineEvent(event: OfflineQueueEvent): boolean {
  if (event === null || typeof event !== 'object' || typeof event.orderId !== 'string' || event.orderId === '') {
    return false;
  }
  if (event.type === 'driver_location') {
    return Number.isFinite(event.lat) && Number.isFinite(event.lng);
  }
  if (event.type === 'delivery_status') {
    // Lectura como unknown: en runtime pueden llegar objetos corruptos
    // (JSON, casts) aunque el tipo diga OrderStatus.
    const status: unknown = event.status;
    return typeof status === 'string' && status !== '';
  }
  return false;
}

function sortByCreatedAt(items: OfflineQueueItem[]): OfflineQueueItem[] {
  return [...items].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Agrega un evento a la cola offline.
 *
 * Para posiciones del repartidor reemplaza la coordenada pendiente previa
 * de la misma orden: sin conexión solo importa la última posición conocida
 * de cada entrega, y así la cola no crece con cada tick del GPS.
 *
 * Devuelve el elemento encolado, o `null` si el evento es inválido o no
 * quedó persistido en ningún almacenamiento disponible.
 */
export async function enqueueOfflineEvent(
  event: OfflineQueueEvent,
): Promise<OfflineQueueItem | null> {
  try {
    if (!isValidOfflineEvent(event)) {
      return null;
    }

    const current = await readAllItems();
    const pending = current.filter(
      (item) =>
        !(
          item.event.type === 'driver_location' &&
          event.type === 'driver_location' &&
          item.event.orderId === event.orderId
        ),
    );

    const item: OfflineQueueItem = {
      id: createQueueItemId(),
      event,
      createdAt: nextCreatedAt(),
    };
    pending.push(item);

    // Tope de la cola: se conservan los eventos más recientes.
    const trimmed = sortByCreatedAt(pending).slice(-MAX_QUEUE_ITEMS);

    const persisted = await writeAllItems(trimmed);
    return persisted ? item : null;
  } catch {
    return null;
  }
}

/** Eventos pendientes de sincronizar, en orden de inserción. */
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    return sortByCreatedAt(await readAllItems());
  } catch {
    return [];
  }
}

/** Elimina de la cola los eventos identificados por su id. */
export async function removeOfflineQueueItems(ids: readonly string[]): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }
  try {
    const removeSet = new Set(ids);
    const current = await readAllItems();
    const remaining = current.filter((item) => !removeSet.has(item.id));
    const persisted = await writeAllItems(remaining);
    return persisted ? current.length - remaining.length : 0;
  } catch {
    return 0;
  }
}

/** Cantidad de eventos pendientes de sincronización. */
export async function getOfflineQueueSize(): Promise<number> {
  const items = await getOfflineQueue();
  return items.length;
}

/** Vacía la cola por completo. */
export async function clearOfflineQueue(): Promise<boolean> {
  return writeAllItems([]);
}
