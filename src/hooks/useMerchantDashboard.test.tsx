import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { OrderRow } from '../types/database';

vi.mock('../services/merchantStaffService', () => ({
  fetchMerchantDrivers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/supabase', () => {
  const realtimeHandlers = new Map<string, (payload: unknown) => void>();
  const channelNames: string[] = [];
  const from = vi.fn();
  const channel = vi.fn().mockImplementation((name: string) => {
    channelNames.push(name);
    const channelMock: Record<string, unknown> = {
      on: vi.fn().mockImplementation((...args: unknown[]) => {
        const [type, config, handler] = args;
        if (type === 'postgres_changes' && typeof handler === 'function') {
          const event = (config as { event: string }).event;
          realtimeHandlers.set(event, handler as (payload: unknown) => void);
        }
        return channelMock;
      }),
      subscribe: vi.fn().mockImplementation((...args: unknown[]) => {
        const callback = args[0];
        if (typeof callback === 'function') {
          (callback as (status: string) => void)('SUBSCRIBED');
        }
        return channelMock;
      }),
    };
    return channelMock;
  });
  return {
    supabase: {
      from,
      channel,
      removeChannel: vi.fn(),
      __realtimeHandlers: realtimeHandlers,
      __channelNames: channelNames,
    },
    TABLE_NAMES: {
      profiles: 'profiles',
      merchants: 'merchants',
      merchantStaff: 'merchant_staff',
      categories: 'categories',
      products: 'products',
      orders: 'orders',
      deliveries: 'deliveries',
    },
  };
});

import { supabase } from '../services/supabase';
import { useMerchantDashboard } from './useMerchantDashboard';

type RealtimeTestSupabase = {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  __realtimeHandlers: Map<string, (payload: unknown) => void>;
  __channelNames: string[];
};

const mockSupabase = supabase as unknown as RealtimeTestSupabase;

function buildOnTheWayOrder(): Record<string, unknown> {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: 'driver-1',
    type: 'delivery',
    status: 'on_the_way',
    payment_method: 'pago_movil',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: '2026-09-23T10:00:00.000Z',
    profiles: { full_name: 'Cliente Prueba', email: 'cliente@test.com' },
  };
}

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function buildWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function merchantIdsChain(data: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation((column: string) => {
        if (column === 'owner_id' || column === 'user_id') {
          return { eq: vi.fn().mockResolvedValue({ data, error: null }) };
        }
        return { eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }),
    }),
  };
}

interface OrdersMockConfig {
  initial: Record<string, unknown>[];
  keepRefetchPending: boolean;
}

let ordersFetchCount = 0;

function ordersChain(config: OrdersMockConfig) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => {
          ordersFetchCount += 1;
          if (ordersFetchCount === 1) {
            return Promise.resolve({ data: config.initial, error: null });
          }
          if (config.keepRefetchPending) {
            return new Promise(() => {});
          }
          return Promise.resolve({ data: config.initial, error: null });
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

function installTableMocks(config: OrdersMockConfig): void {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'merchants') return merchantIdsChain([{ id: 'm-1' }]);
    if (table === 'merchant_staff') return merchantIdsChain([]);
    if (table === 'orders') return ordersChain(config);
    return {};
  });
}

function resetRealtimeMocks(): void {
  mockSupabase.from.mockReset();
  mockSupabase.channel.mockClear();
  mockSupabase.removeChannel.mockClear();
  mockSupabase.__realtimeHandlers.clear();
  mockSupabase.__channelNames.length = 0;
  ordersFetchCount = 0;
}

describe('useMerchantDashboard realtime', () => {
  beforeAll(() => {
    notifyManager.setScheduler((callback) => callback());
  });

  afterAll(() => {
    notifyManager.setScheduler((callback) => {
      setTimeout(callback, 0);
    });
  });

  beforeEach(() => {
    resetRealtimeMocks();
  });

  it('aplica el estado delivered en memoria al recibir un UPDATE de postgres_changes', async () => {
    installTableMocks({ initial: [buildOnTheWayOrder()], keepRefetchPending: true });

    const client = buildQueryClient();
    const { result } = renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
    });
    expect(result.current.orders[0].status).toBe('on_the_way');

    await act(async () => {
      mockSupabase.__realtimeHandlers.get('UPDATE')?.({
        new: { id: 'order-1', status: 'delivered' },
      });
    });

    expect(result.current.orders[0].status).toBe('delivered');
  });

  it('conserva los datos del join de cliente al aplicar el UPDATE en memoria', async () => {
    installTableMocks({ initial: [buildOnTheWayOrder()], keepRefetchPending: true });

    const client = buildQueryClient();
    const { result } = renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
    });

    await act(async () => {
      mockSupabase.__realtimeHandlers.get('UPDATE')?.({
        new: { id: 'order-1', status: 'delivered' },
      });
    });

    expect(result.current.orders[0].status).toBe('delivered');
    expect(result.current.orders[0].profiles?.full_name).toBe('Cliente Prueba');
  });

  it('usa un nombre de canal único por suscripción para no reusar canales en remoción', async () => {
    installTableMocks({ initial: [], keepRefetchPending: true });

    const first = renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never),
      { wrapper: buildWrapper(buildQueryClient()) },
    );
    await waitFor(() => {
      expect(mockSupabase.__channelNames.length).toBeGreaterThanOrEqual(1);
    });
    first.unmount();

    const second = renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never),
      { wrapper: buildWrapper(buildQueryClient()) },
    );
    await waitFor(() => {
      expect(mockSupabase.__channelNames.length).toBeGreaterThanOrEqual(2);
    });
    second.unmount();

    const [firstName, secondName] = mockSupabase.__channelNames;
    expect(secondName).not.toBe(firstName);
  });

  it('notifica pedidos nuevos cuando el INSERT llega con payment_pending', async () => {
    installTableMocks({ initial: [], keepRefetchPending: true });
    const onNewOrder = vi.fn((order: OrderRow) => order);

    const client = buildQueryClient();
    renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never, { onNewOrder }),
      { wrapper: buildWrapper(client) },
    );

    await waitFor(() => {
      expect(mockSupabase.__realtimeHandlers.size).toBeGreaterThan(0);
    });

    await act(async () => {
      mockSupabase.__realtimeHandlers.get('INSERT')?.({
        new: { id: 'order-9', status: 'payment_pending', total_amount: '200.00' },
      });
    });

    expect(onNewOrder).toHaveBeenCalledTimes(1);
    expect(onNewOrder.mock.calls[0][0]).toMatchObject({
      id: 'order-9',
      status: 'payment_pending',
    });
  });

  it('se suscribe a postgres_changes de orders filtrando por merchant_id', async () => {
    installTableMocks({ initial: [], keepRefetchPending: true });

    const client = buildQueryClient();
    renderHook(
      () => useMerchantDashboard({ id: 'u-1' } as never),
      { wrapper: buildWrapper(client) },
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    const channelMock = mockSupabase.channel.mock.results[0]?.value as {
      on: ReturnType<typeof vi.fn>;
    };
    const postgresConfigs = channelMock.on.mock.calls
      .map(([type, config]) => ({ type, config }))
      .filter(({ type }) => type === 'postgres_changes');

    expect(postgresConfigs.length).toBeGreaterThanOrEqual(2);
    postgresConfigs.forEach(({ config }) => {
      expect(config.table).toBe('orders');
      expect(config.filter).toContain('merchant_id=in.(m-1)');
    });
    const events = postgresConfigs.map(({ config }) => config.event);
    expect(events).toContain('INSERT');
    expect(events).toContain('UPDATE');
  });
});
