import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  computeMerchantMetrics,
  fetchMerchantOrders,
  type MerchantOrderRow,
} from './merchantMetricsService';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { orders: 'orders' },
}));

function mockOrdersChain(rows: MerchantOrderRow[]): {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: (resolve: (v: unknown) => unknown) => void;
} {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return chain;
}

describe('computeMerchantMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2026-08-26T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseOrders: MerchantOrderRow[] = [
    {
      id: 'o-1',
      status: 'delivered',
      total_amount: '150.00',
      created_at: '2026-08-20T00:00:00Z',
    },
    {
      id: 'o-2',
      status: 'cancelled',
      total_amount: '80.00',
      created_at: '2026-08-21T00:00:00Z',
    },
    {
      id: 'o-3',
      status: 'delivered',
      total_amount: '250.50',
      created_at: '2026-07-10T00:00:00Z',
    },
  ];

  it('suma ingresos de pedidos entregados y excluye cancelados', () => {
    const metrics = computeMerchantMetrics(baseOrders);
    expect(metrics.totalRevenue).toBe(400.5);
    expect(metrics.totalOrders).toBe(3);
    expect(metrics.completedOrders).toBe(2);
    expect(metrics.cancelledOrders).toBe(1);
  });

  it('calcula el ticket promedio sobre pedidos completados', () => {
    const metrics = computeMerchantMetrics(baseOrders);
    expect(metrics.averageTicket).toBeCloseTo(200.25, 2);
  });

  it('devuelve ceros y ticket 0 cuando no hay pedidos', () => {
    const metrics = computeMerchantMetrics([]);
    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.totalOrders).toBe(0);
    expect(metrics.averageTicket).toBe(0);
    expect(metrics.activityLevel).toBe('Inactivo');
  });

  it('marca actividad Alta cuando hay 20 o más pedidos en 30 días', () => {
    const recent: MerchantOrderRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: `r-${i}`,
      status: 'delivered',
      total_amount: '10.00',
      created_at: '2026-08-25T00:00:00Z',
    }));
    const metrics = computeMerchantMetrics(recent);
    expect(metrics.activityLevel).toBe('Alta');
    expect(metrics.ordersLast30Days).toBe(25);
  });

  it('marca actividad Media con entre 5 y 19 pedidos recientes', () => {
    const recent: MerchantOrderRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `m-${i}`,
      status: 'delivered',
      total_amount: '10.00',
      created_at: '2026-08-25T00:00:00Z',
    }));
    const metrics = computeMerchantMetrics(recent);
    expect(metrics.activityLevel).toBe('Media');
  });

  it('marca actividad Baja con menos de 5 pedidos recientes', () => {
    const recent: MerchantOrderRow[] = Array.from({ length: 3 }, (_, i) => ({
      id: `b-${i}`,
      status: 'delivered',
      total_amount: '10.00',
      created_at: '2026-08-25T00:00:00Z',
    }));
    const metrics = computeMerchantMetrics(recent);
    expect(metrics.activityLevel).toBe('Baja');
  });

  it('ignora pedidos antiguos al calcular la actividad de 30 días', () => {
    const orders: MerchantOrderRow[] = Array.from({ length: 2 }, (_, i) => ({
      id: `old-${i}`,
      status: 'delivered',
      total_amount: '10.00',
      created_at: '2026-07-01T00:00:00Z',
    }));
    const metrics = computeMerchantMetrics(orders);
    expect(metrics.ordersLast30Days).toBe(0);
    expect(metrics.activityLevel).toBe('Inactivo');
  });
});

describe('fetchMerchantOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta la tabla orders filtrada por merchant_id', async () => {
    const chain = mockOrdersChain([]);
    supabaseMocks.from.mockReturnValue(chain);

    const result = await fetchMerchantOrders('merchant-1');

    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
    expect(chain.select).toHaveBeenCalledWith(
      'id, status, total_amount, created_at',
    );
    expect(chain.eq).toHaveBeenCalledWith('merchant_id', 'merchant-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(result).toEqual([]);
  });

  it('devuelve los pedidos recibidos', async () => {
    const rows: MerchantOrderRow[] = [
      {
        id: 'o-1',
        status: 'delivered',
        total_amount: '100.00',
        created_at: '2026-08-20T00:00:00Z',
      },
    ];
    supabaseMocks.from.mockReturnValue(mockOrdersChain(rows));

    const result = await fetchMerchantOrders('merchant-1');
    expect(result).toEqual(rows);
  });

  it('lanza un error descriptivo si el comercio es vacío', async () => {
    await expect(fetchMerchantOrders('   ')).rejects.toThrow(
      'Se requiere el identificador del comercio.',
    );
  });

  it('propaga el error de Supabase', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: null, error: { message: 'rls denied' } }),
    });

    await expect(fetchMerchantOrders('merchant-1')).rejects.toThrow(
      'Error al obtener pedidos del comercio: rls denied',
    );
  });
});
