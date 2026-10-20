import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOfflineQueue,
  enqueueOfflineEvent,
  getOfflineQueue,
  getOfflineQueueSize,
  isBrowserOffline,
  removeOfflineQueueItems,
  type OfflineDeliveryStatusEvent,
  type OfflineDriverLocationEvent,
  type OfflineQueueItem,
} from './offlineSyncQueue';

/**
 * La suite corre en jsdom, que no implementa IndexedDB: por defecto se
 * ejercita el respaldo en localStorage. El bloque `IndexedDB` instala una
 * implementación mínima in-memory para cubrir la vía principal.
 */

const LOCATION_EVENT: OfflineDriverLocationEvent = {
  type: 'driver_location',
  orderId: 'order-1',
  lat: 10.4806,
  lng: -66.9036,
  recordedAt: Date.now(),
};

const STATUS_EVENT: OfflineDeliveryStatusEvent = {
  type: 'delivery_status',
  orderId: 'order-1',
  status: 'on_the_way',
  driverId: 'driver-1',
  recordedAt: Date.now(),
};

beforeEach(() => {
  localStorage.clear();
});

describe('offlineSyncQueue — respaldo en localStorage', () => {
  it('encola y recupera una posición de repartidor', async () => {
    const item = await enqueueOfflineEvent({ ...LOCATION_EVENT });

    expect(item).not.toBeNull();
    expect(item?.id).toEqual(expect.any(String));

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].event).toEqual(LOCATION_EVENT);
    expect(await getOfflineQueueSize()).toBe(1);
  });

  it('reemplaza la posición pendiente previa de la misma orden (gana la última)', async () => {
    await enqueueOfflineEvent({ ...LOCATION_EVENT, lat: 10.1 });
    const latest = await enqueueOfflineEvent({ ...LOCATION_EVENT, lat: 10.2 });

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(latest?.id);
    expect((queue[0].event as typeof LOCATION_EVENT).lat).toBe(10.2);
  });

  it('conserva posiciones de órdenes distintas y las ordena cronológicamente', async () => {
    await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-a' });
    await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-b' });

    const queue = await getOfflineQueue();
    expect(queue.map((item) => (item.event as typeof LOCATION_EVENT).orderId)).toEqual([
      'order-a',
      'order-b',
    ]);
  });

  it('conserva la secuencia de estados de una misma orden', async () => {
    await enqueueOfflineEvent({ ...STATUS_EVENT, status: 'on_the_way' });
    await enqueueOfflineEvent({ ...STATUS_EVENT, status: 'delivered' });

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(2);
    expect((queue[0].event as typeof STATUS_EVENT).status).toBe('on_the_way');
    expect((queue[1].event as typeof STATUS_EVENT).status).toBe('delivered');
  });

  it('rechaza eventos inválidos sin ensuciar la cola', async () => {
    expect(await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: '' })).toBeNull();
    expect(await enqueueOfflineEvent({ ...LOCATION_EVENT, lat: Number.NaN })).toBeNull();
    expect(
      await enqueueOfflineEvent({ ...STATUS_EVENT, status: '' as never }),
    ).toBeNull();

    expect(await getOfflineQueueSize()).toBe(0);
  });

  it('removeOfflineQueueItems elimina exactamente los ids indicados', async () => {
    const first = await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-a' });
    const second = await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-b' });

    const removed = await removeOfflineQueueItems([first?.id ?? 'missing']);

    expect(removed).toBe(1);
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(second?.id);
    expect(await removeOfflineQueueItems([])).toBe(0);
  });

  it('respeta el tope de la cola descartando los eventos más viejos', async () => {
    const inserted: OfflineQueueItem[] = [];
    for (let index = 0; index < 205; index += 1) {
      const item = await enqueueOfflineEvent({
        ...LOCATION_EVENT,
        orderId: `order-${index}`,
      });
      if (item !== null) inserted.push(item);
    }

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(200);
    expect(queue[0].id).toBe(inserted[5].id);
    expect(queue[199].id).toBe(inserted[204].id);
  });

  it('clearOfflineQueue vacía la cola', async () => {
    await enqueueOfflineEvent({ ...LOCATION_EVENT });
    expect(await clearOfflineQueue()).toBe(true);
    expect(await getOfflineQueueSize()).toBe(0);
  });

  it('isBrowserOffline refleja navigator.onLine', async () => {
    expect(isBrowserOffline()).toBe(false);

    const onlineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect(isBrowserOffline()).toBe(true);
    } finally {
      onlineSpy.mockRestore();
    }
  });
});

/* ------------------------- Vía principal: IndexedDB ------------------------ */

interface FakeRequest<T> {
  result: T;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

/** Almacén compartido por todas las "aperturas" de la base falsa. */
const fakeStore = new Map<string, unknown>();
let fakeStoreCreated = false;

function fireRequest<T>(request: FakeRequest<T>): FakeRequest<T> {
  // Los handlers se asignan justo después de crear el request; el disparo
  // en microtask replica el comportamiento asíncrono de IndexedDB.
  Promise.resolve().then(() => {
    if (request.error !== null) {
      request.onerror?.();
      return;
    }
    request.onsuccess?.();
  });
  return request;
}

function createFakeRequest<T>(result: T, error: unknown = null): FakeRequest<T> {
  return { result, error, onsuccess: null, onerror: null };
}

class FakeObjectStore {
  getAll(): FakeRequest<unknown[]> {
    return fireRequest(createFakeRequest([...fakeStore.values()]));
  }

  put(value: { id: string }): void {
    fakeStore.set(value.id, value);
  }

  clear(): void {
    fakeStore.clear();
  }
}

class FakeTransaction {
  error: unknown = null;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly store = new FakeObjectStore();

  objectStore(): FakeObjectStore {
    return this.store;
  }
}

class FakeDatabase {
  get objectStoreNames(): { contains: () => boolean } {
    return { contains: () => fakeStoreCreated };
  }

  createObjectStore(): void {
    fakeStoreCreated = true;
  }

  transaction(): FakeTransaction {
    const transaction = new FakeTransaction();
    Promise.resolve().then(() => {
      transaction.oncomplete?.();
    });
    return transaction;
  }

  close(): void {
    /* la base falsa vive durante toda la suite */
  }
}

function installFakeIndexedDb(): void {
  const openRequest = createFakeRequest(new FakeDatabase());
  Object.defineProperty(globalThis, 'indexedDB', {
    value: {
      open: () => {
        Promise.resolve().then(() => {
          if (!fakeStoreCreated && openRequest.result instanceof FakeDatabase) {
            openRequest.result.createObjectStore();
          }
          openRequest.onsuccess?.();
        });
        return openRequest;
      },
    },
    configurable: true,
    writable: true,
  });
}

describe('offlineSyncQueue — vía IndexedDB', () => {
  beforeEach(() => {
    fakeStore.clear();
    fakeStoreCreated = false;
    installFakeIndexedDb();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('encola y recupera eventos a través de IndexedDB', async () => {
    const item = await enqueueOfflineEvent({ ...LOCATION_EVENT });
    expect(item).not.toBeNull();

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].event).toEqual(LOCATION_EVENT);
  });

  it('reemplaza la posición pendiente de la misma orden vía IndexedDB', async () => {
    await enqueueOfflineEvent({ ...LOCATION_EVENT, lat: 10.1 });
    await enqueueOfflineEvent({ ...LOCATION_EVENT, lat: 10.2 });

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect((queue[0].event as typeof LOCATION_EVENT).lat).toBe(10.2);
  });

  it('removeOfflineQueueItems borra de IndexedDB los ids sincronizados', async () => {
    const first = await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-a' });
    await enqueueOfflineEvent({ ...LOCATION_EVENT, orderId: 'order-b' });

    const removed = await removeOfflineQueueItems([first?.id ?? 'missing']);

    expect(removed).toBe(1);
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect((queue[0].event as typeof LOCATION_EVENT).orderId).toBe('order-b');
  });
});
