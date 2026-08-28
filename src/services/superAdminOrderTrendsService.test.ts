import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  computeRevenueTrend,
  computeOrderStatusTrend,
  toStatusGroup,
  toLocalDateKey,
  fetchOrdersForTrends,
  type OrderTrendRaw,
} from './superAdminOrderTrendsService';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { orders: 'orders' },
}));

const NOW = new Date('2026-08-28T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function orderAt(offsetDaysAgo: number, amount: string, status: OrderTrendRaw['status']): OrderTrendRaw {
  const ts = new Date(NOW.getTime() - offsetDaysAgo * DAY_MS).toISOString();
  return { created_at: ts, total_amount: amount, status };
}

describe('toLocalDateKey', () => {
  it('produce una clave ISO YYYY-MM-DD determinista', () => {
    const d = new Date('2026-08-28T12:00:00Z');
    expect(toLocalDateKey(d)).toBe('2026-08-28');
  });
});

describe('toStatusGroup', () => {
  it('agrupa estados no finalizados como in_process', () => {
    expect(toStatusGroup('delivered')).toBe('delivered');
    expect(toStatusGroup('cancelled')).toBe('cancelled');
    expect(toStatusGroup('confirmed')).toBe('in_process');
    expect(toStatusGroup('payment_pending')).toBe('in_process');
    expect(toStatusGroup('on_the_way')).toBe('in_process');
  });
});

describe('computeRevenueTrend', () => {
  it('devuelve un punto por día con ceros cuando no hay pedidos', () => {
    const points = computeRevenueTrend([], 5, NOW);
    expect(points).toHaveLength(5);
    expect(points.every((p) => p.revenue === 0)).toBe(true);
    // Ordenado de más antiguo a más reciente
    expect(points[0].dayOffset).toBe(4);
    expect(points[4].dayOffset).toBe(0);
    expect(points[4].date).toBe('2026-08-28');
  });

  it('suma ingresos por día y los asigna al bucket correcto', () => {
    const orders: OrderTrendRaw[] = [
      orderAt(0, '120.00', 'delivered'),      // hoy
      orderAt(0, '30.50', 'confirmed'),       // hoy
      orderAt(2, '200.00', 'delivered'),      // hace 2 días
    ];
    const points = computeRevenueTrend(orders, 5, NOW);
    const today = points.find((p) => p.dayOffset === 0);
    const twoDaysAgo = points.find((p) => p.dayOffset === 2);
    expect(today?.revenue).toBeCloseTo(150.5, 2);
    expect(twoDaysAgo?.revenue).toBeCloseTo(200, 2);
    // Días intermedios sin pedidos quedan en cero
    expect(points.find((p) => p.dayOffset === 1)?.revenue).toBe(0);
  });

  it('descarta pedidos fuera de la ventana de días', () => {
    const orders: OrderTrendRaw[] = [orderAt(10, '999.00', 'delivered')]; // fuera de 5 días
    const points = computeRevenueTrend(orders, 5, NOW);
    expect(points.every((p) => p.revenue === 0)).toBe(true);
  });

  it('asigna pedidos en el futuro al día de hoy', () => {
    const future = new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const orders: OrderTrendRaw[] = [
      { created_at: future, total_amount: '50.00', status: 'delivered' },
    ];
    const points = computeRevenueTrend(orders, 3, NOW);
    expect(points.find((p) => p.dayOffset === 0)?.revenue).toBeCloseTo(50, 2);
  });

  it('trata total_amount no numérico como 0', () => {
    const orders: OrderTrendRaw[] = [orderAt(0, 'abc', 'cancelled')];
    const points = computeRevenueTrend(orders, 3, NOW);
    expect(points.find((p) => p.dayOffset === 0)?.revenue).toBe(0);
  });
});

describe('computeOrderStatusTrend', () => {
  it('devuelve un punto por día con los tres grupos en cero', () => {
    const points = computeOrderStatusTrend([], 3, NOW);
    expect(points).toHaveLength(3);
    for (const point of points) {
      expect(point.counts.delivered).toBe(0);
      expect(point.counts.cancelled).toBe(0);
      expect(point.counts.in_process).toBe(0);
    }
  });

  it('cuenta pedidos por grupo y día', () => {
    const orders: OrderTrendRaw[] = [
      orderAt(0, '10.00', 'delivered'),
      orderAt(0, '10.00', 'confirmed'),     // → in_process
      orderAt(0, '10.00', 'cancelled'),
      orderAt(1, '10.00', 'delivered'),
      orderAt(1, '10.00', 'preparing'),      // → in_process
    ];
    const points = computeOrderStatusTrend(orders, 3, NOW);
    const today = points.find((p) => p.dayOffset === 0)!;
    const yesterday = points.find((p) => p.dayOffset === 1)!;
    expect(today.counts.delivered).toBe(1);
    expect(today.counts.in_process).toBe(1);
    expect(today.counts.cancelled).toBe(1);
    expect(yesterday.counts.delivered).toBe(1);
    expect(yesterday.counts.in_process).toBe(1);
    expect(yesterday.counts.cancelled).toBe(0);
  });

  it('no cuenta pedidos fuera de la ventana', () => {
    const orders: OrderTrendRaw[] = [orderAt(9, '10.00', 'delivered')];
    const points = computeOrderStatusTrend(orders, 5, NOW);
    expect(points.every((p) => p.counts.delivered === 0)).toBe(true);
  });
});

describe('fetchOrdersForTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockChain(rows: OrderTrendRaw[] | { message: string }) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: rows, error: null }),
    };
    return chain;
  }

  it('consulta orders con select, gte y order', async () => {
    supabaseMocks.from.mockReturnValue(mockChain([]));
    await fetchOrdersForTrends(30);
    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
    const chain = supabaseMocks.from.mock.results[0].value;
    expect(chain.select).toHaveBeenCalledWith('created_at, total_amount, status');
    expect(chain.gte).toHaveBeenCalledWith('created_at', expect.any(String));
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('devuelve los pedidos agrupados', async () => {
    const rows: OrderTrendRaw[] = [orderAt(0, '100.00', 'delivered')];
    supabaseMocks.from.mockReturnValue(mockChain(rows));
    const result = await fetchOrdersForTrends(30);
    expect(result).toEqual(rows);
  });

  it('lanza error descriptivo cuando days es negativo', async () => {
    await expect(fetchOrdersForTrends(0)).rejects.toThrow(
      'El número de días debe ser positivo.',
    );
  });

  it('propaga el error de Supabase', async () => {
    supabaseMocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: null, error: { message: 'rls denied' } }),
    });
    await expect(fetchOrdersForTrends(30)).rejects.toThrow(
      'Error al obtener tendencias de pedidos: rls denied',
    );
  });
});
