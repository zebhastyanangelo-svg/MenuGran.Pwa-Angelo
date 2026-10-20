import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

const queueMocks = vi.hoisted(() => ({
  getOfflineQueue: vi.fn(),
  removeOfflineQueueItems: vi.fn(),
  enqueueOfflineEvent: vi.fn(),
  isBrowserOffline: vi.fn(),
  getOfflineQueueSize: vi.fn(),
}));

const pushMocks = vi.hoisted(() => ({
  dispatchOrderStatusPushToCustomer: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { orders: 'orders', deliveries: 'deliveries' },
}));

vi.mock('./orderStatusPushService', () => ({
  dispatchOrderStatusPushToCustomer: pushMocks.dispatchOrderStatusPushToCustomer,
}));

vi.mock('../utils/offlineSyncQueue', () => ({
  getOfflineQueue: queueMocks.getOfflineQueue,
  removeOfflineQueueItems: queueMocks.removeOfflineQueueItems,
  enqueueOfflineEvent: queueMocks.enqueueOfflineEvent,
  isBrowserOffline: queueMocks.isBrowserOffline,
  getOfflineQueueSize: queueMocks.getOfflineQueueSize,
}));

import {
  flushOfflineQueue,
  persistOrderStatus,
  scheduleOfflineSync,
} from './offlineSyncService';
import type { OfflineQueueItem } from '../utils/offlineSyncQueue';

function buildUpdateChain(result: { error: unknown }) {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockResolvedValue(result);
  return chain;
}

function buildLocationItem(orderId: string, lat: number, lng: number): OfflineQueueItem {
  return {
    id: `loc-${orderId}`,
    createdAt: Date.now(),
    event: { type: 'driver_location', orderId, lat, lng, recordedAt: Date.now() },
  };
}

function buildStatusItem(
  orderId: string,
  status: 'on_the_way' | 'delivered',
  driverId: string | null,
): OfflineQueueItem {
  return {
    id: `status-${orderId}`,
    createdAt: Date.now(),
    event: { type: 'delivery_status', orderId, status, driverId, recordedAt: Date.now() },
  };
}

describe('flushOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMocks.getOfflineQueueSize.mockResolvedValue(0);
  });

  it('con la cola vacía no toca Supabase y reporta cero pendientes', async () => {
    queueMocks.getOfflineQueue.mockResolvedValue([]);

    const result = await flushOfflineQueue();

    expect(result).toEqual({ syncedItems: 0, remainingItems: 0, error: null });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(queueMocks.removeOfflineQueueItems).not.toHaveBeenCalled();
  });

  it('sincroniza una posición: UPDATE deliveries.current_location con el punto (lng,lat)', async () => {
    const item = buildLocationItem('order-1', 10.4806, -66.9036);
    queueMocks.getOfflineQueue.mockResolvedValue([item]);
    queueMocks.removeOfflineQueueItems.mockResolvedValue(1);
    const chain = buildUpdateChain({ error: null });
    supabaseMocks.from.mockReturnValue(chain);

    const result = await flushOfflineQueue();

    expect(supabaseMocks.from).toHaveBeenCalledWith('deliveries');
    expect(chain.update).toHaveBeenCalledWith({ current_location: '(-66.9036,10.4806)' });
    expect(chain.eq).toHaveBeenCalledWith('order_id', 'order-1');
    expect(queueMocks.removeOfflineQueueItems).toHaveBeenCalledWith([item.id]);
    expect(result).toEqual({ syncedItems: 1, remainingItems: 0, error: null });
  });

  it('sincroniza un estado de entrega: UPDATE orders + aviso push al cliente', async () => {
    const item = buildStatusItem('order-2', 'on_the_way', 'driver-1');
    queueMocks.getOfflineQueue.mockResolvedValue([item]);
    queueMocks.removeOfflineQueueItems.mockResolvedValue(1);
    const chain = buildUpdateChain({ error: null });
    supabaseMocks.from.mockReturnValue(chain);

    const result = await flushOfflineQueue();

    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
    expect(chain.update).toHaveBeenCalledWith({ status: 'on_the_way', driver_id: 'driver-1' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'order-2');
    expect(pushMocks.dispatchOrderStatusPushToCustomer).toHaveBeenCalledWith(
      'order-2',
      'on_the_way',
    );
    expect(result).toEqual({ syncedItems: 1, remainingItems: 0, error: null });
  });

  it('omite driver_id cuando el evento de estado no trae repartidor', async () => {
    const item = buildStatusItem('order-3', 'delivered', null);
    queueMocks.getOfflineQueue.mockResolvedValue([item]);
    queueMocks.removeOfflineQueueItems.mockResolvedValue(1);
    const chain = buildUpdateChain({ error: null });
    supabaseMocks.from.mockReturnValue(chain);

    await flushOfflineQueue();

    expect(chain.update).toHaveBeenCalledWith({ status: 'delivered' });
  });

  it('al primer fallo corta el envío y conserva el resto de la cola en orden', async () => {
    const first = buildStatusItem('order-a', 'on_the_way', 'driver-1');
    const second = buildStatusItem('order-b', 'delivered', null);
    queueMocks.getOfflineQueue.mockResolvedValue([first, second]);
    queueMocks.removeOfflineQueueItems.mockResolvedValue(1);

    const okChain = buildUpdateChain({ error: null });
    const failingChain = buildUpdateChain({ error: new Error('red caída') });
    supabaseMocks.from
      .mockReturnValueOnce(okChain)
      .mockReturnValueOnce(failingChain);

    const result = await flushOfflineQueue();

    expect(result.syncedItems).toBe(1);
    expect(result.remainingItems).toBe(1);
    expect(result.error).toBe('red caída');
    // Solo el primer evento sale de la cola; el segundo espera al reintento.
    expect(queueMocks.removeOfflineQueueItems).toHaveBeenCalledWith([first.id]);
    expect(okChain.eq).toHaveBeenCalledWith('id', 'order-a');
    expect(failingChain.eq).toHaveBeenCalledWith('id', 'order-b');
  });

  it('un error sin mensaje se traduce a texto genérico', async () => {
    const item = buildLocationItem('order-c', 1, 1);
    queueMocks.getOfflineQueue.mockResolvedValue([item]);
    const chain = buildUpdateChain({ error: 'network' });
    supabaseMocks.from.mockReturnValue(chain);

    const result = await flushOfflineQueue();

    expect(result.error).toBe('Error de sincronización offline');
    expect(result.syncedItems).toBe(0);
    expect(queueMocks.removeOfflineQueueItems).not.toHaveBeenCalled();
  });
});

describe('persistOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMocks.getOfflineQueueSize.mockResolvedValue(0);
  });

  it('con conexión aplica el cambio en Supabase y no encola', async () => {
    queueMocks.isBrowserOffline.mockReturnValue(false);
    const chain = buildUpdateChain({ error: null });
    supabaseMocks.from.mockReturnValue(chain);

    await persistOrderStatus('order-1', 'on_the_way', 'driver-9');

    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
    expect(chain.update).toHaveBeenCalledWith({ status: 'on_the_way', driver_id: 'driver-9' });
    expect(queueMocks.enqueueOfflineEvent).not.toHaveBeenCalled();
  });

  it('sin conexión encola el estado para sincronización diferida', async () => {
    queueMocks.isBrowserOffline.mockReturnValue(true);
    queueMocks.enqueueOfflineEvent.mockResolvedValue({
      id: 'queued-1',
      createdAt: Date.now(),
      event: {},
    });

    await persistOrderStatus('order-1', 'delivered', null);

    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(queueMocks.enqueueOfflineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'delivery_status',
        orderId: 'order-1',
        status: 'delivered',
      }),
    );
  });

  it('sin conexión falla si ni siquiera pudo guardar localmente', async () => {
    queueMocks.isBrowserOffline.mockReturnValue(true);
    queueMocks.enqueueOfflineEvent.mockResolvedValue(null);

    await expect(persistOrderStatus('order-1', 'delivered')).rejects.toThrow(
      'Sin conexión',
    );
  });
});

describe('scheduleOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMocks.getOfflineQueueSize.mockResolvedValue(0);
  });

  it('vacía la cola cuando el navegador recupera conexión', async () => {
    const item = buildLocationItem('order-sync', 10.5, -66.9);
    queueMocks.getOfflineQueue.mockResolvedValue([item]);
    queueMocks.removeOfflineQueueItems.mockResolvedValue(1);
    supabaseMocks.from.mockReturnValue(buildUpdateChain({ error: null }));

    scheduleOfflineSync();
    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => {
      expect(queueMocks.getOfflineQueue).toHaveBeenCalled();
      expect(supabaseMocks.from).toHaveBeenCalledWith('deliveries');
    });
  });

  it('es idempotente: registrar dos veces no duplica el listener', async () => {
    queueMocks.getOfflineQueue.mockResolvedValue([]);
    queueMocks.getOfflineQueueSize.mockResolvedValue(1);

    scheduleOfflineSync();
    scheduleOfflineSync();
    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => {
      expect(queueMocks.getOfflineQueue).toHaveBeenCalledTimes(1);
    });
  });
});
