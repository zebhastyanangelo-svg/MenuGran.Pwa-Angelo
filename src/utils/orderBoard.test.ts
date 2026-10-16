import { describe, expect, it } from 'vitest';
import type { OrderStatus, PaymentMethod } from '../types/database';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';
import {
  ORDER_BOARD_PERIODS,
  ORDER_BOARD_TABS,
  collectAvailablePaymentMethods,
  countOrdersByTab,
  filterOrdersByFacets,
  filterOrdersByTab,
  formatBoardDateLabel,
  formatElapsedTime,
  formatVes,
  getOrderBoardDateRange,
  getOrderBoardKpis,
  getOrderShortCode,
  getPaymentValidationState,
  isOrderInRange,
  matchesOrderQuery,
  toVes,
  type OrderBoardDateRange,
} from './orderBoard';

const NOW = new Date('2026-10-24T15:30:00.000Z');

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: '845f9a12-0000-4000-8000-000000000000',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'payment_pending',
    payment_method: 'pago_movil',
    payment_reference: 'REF-9999',
    payment_proof_url: 'proofs/845f.jpg',
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: NOW.toISOString(),
    profiles: { full_name: 'María López', email: 'maria@test.com', ci: 'V12345678', phone: '+584141234567' },
    ...overrides,
  };
}

const NO_RANGE: OrderBoardDateRange = { start: null, end: null };

describe('getOrderShortCode', () => {
  it('deriva el código corto en mayúsculas con prefijo #', () => {
    expect(getOrderShortCode('845f9a12-0000')).toBe('#845F');
  });
});

describe('formatElapsedTime', () => {
  it('muestra minutos mientras el pedido es reciente', () => {
    const created = new Date(NOW.getTime() - 4 * 60_000).toISOString();
    expect(formatElapsedTime(created, NOW)).toBe('Hace 4 min');
  });

  it('cambia a horas y luego a días', () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    const threeDaysAgo = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
    expect(formatElapsedTime(twoHoursAgo, NOW)).toBe('Hace 2 h');
    expect(formatElapsedTime(threeDaysAgo, NOW)).toBe('Hace 3 d');
  });

  it('degrada a "Hace instantes" y a guion para fechas inválidas', () => {
    expect(formatElapsedTime(NOW.toISOString(), NOW)).toBe('Hace instantes');
    expect(formatElapsedTime('no-es-fecha', NOW)).toBe('—');
  });
});

describe('formatBoardDateLabel', () => {
  it('antepone "Hoy" a la fecha legible', () => {
    expect(formatBoardDateLabel(NOW)).toMatch(/^Hoy, \d{1,2} de /i);
  });
});

describe('formatVes / toVes', () => {
  it('formatea bolívares con dos decimales', () => {
    expect(formatVes(1500)).toMatch(/1[.\s]?500,00/);
  });

  it('devuelve 0 cuando la tasa BCV aún no está disponible', () => {
    expect(toVes(150, 0)).toBe(0);
    expect(toVes(150, 10)).toBe(1500);
  });
});

describe('getPaymentValidationState', () => {
  it('marca como validado cualquier pedido que ya salió de payment_pending', () => {
    expect(getPaymentValidationState(buildOrder({ status: 'confirmed' }))).toBe('validated');
    expect(getPaymentValidationState(buildOrder({ status: 'delivered' }))).toBe('validated');
  });

  it('marca falta de referencia cuando el pago sigue pendiente sin referencia', () => {
    expect(
      getPaymentValidationState(buildOrder({ payment_reference: null })),
    ).toBe('missing_reference');
    expect(
      getPaymentValidationState(buildOrder({ payment_reference: '   ' })),
    ).toBe('missing_reference');
  });

  it('deja el pago pendiente a la espera cuando sí hay referencia', () => {
    expect(getPaymentValidationState(buildOrder())).toBe('awaiting');
  });
});

describe('getOrderBoardDateRange', () => {
  it('acota el día completo para "today"', () => {
    const range = getOrderBoardDateRange('today', NOW);
    expect(range.start?.getHours()).toBe(0);
    expect(range.end?.getHours()).toBe(23);
  });

  it('retrocede seis días para "last_7_days"', () => {
    const range = getOrderBoardDateRange('last_7_days', NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() - 6);
    expected.setHours(0, 0, 0, 0);
    expect(range.start?.getDate()).toBe(expected.getDate());
  });

  it('devuelve rango abierto para "all"', () => {
    expect(getOrderBoardDateRange('all', NOW)).toEqual(NO_RANGE);
  });

  it('cubre el mes completo anterior para "last_month"', () => {
    const range = getOrderBoardDateRange('last_month', NOW);
    expect(range.start?.getMonth()).toBe(8);
    expect(range.start?.getDate()).toBe(1);
    expect(range.end?.getMonth()).toBe(8);
    expect(range.end?.getDate()).toBe(30);
    expect(range.end?.getHours()).toBe(23);
  });

  it('expone los presets de período esperados', () => {
    expect(ORDER_BOARD_PERIODS.map((option) => option.value)).toContain('today');
    expect(ORDER_BOARD_PERIODS).toHaveLength(5);
  });
});

describe('isOrderInRange', () => {
  it('acepta cualquier orden cuando el rango está abierto', () => {
    expect(isOrderInRange(buildOrder(), NO_RANGE)).toBe(true);
  });

  it('excluye las órdenes creadas antes del rango', () => {
    const range: OrderBoardDateRange = {
      start: new Date(NOW),
      end: new Date(NOW.getTime() + 1000),
    };
    const old = buildOrder({ created_at: new Date(NOW.getTime() - 60_000).toISOString() });
    expect(isOrderInRange(old, range)).toBe(false);
    expect(isOrderInRange(buildOrder(), range)).toBe(true);
  });
});

describe('matchesOrderQuery', () => {
  it('acepta cualquier orden con la búsqueda vacía', () => {
    expect(matchesOrderQuery(buildOrder(), '   ')).toBe(true);
  });

  it('encuentra por código corto con o sin prefijo #', () => {
    expect(matchesOrderQuery(buildOrder(), '845F')).toBe(true);
    expect(matchesOrderQuery(buildOrder(), '#845f')).toBe(true);
  });

  it('encuentra por nombre, cédula y teléfono del cliente', () => {
    expect(matchesOrderQuery(buildOrder(), 'maría')).toBe(true);
    expect(matchesOrderQuery(buildOrder(), 'V12345678')).toBe(true);
    expect(matchesOrderQuery(buildOrder(), '4141234567')).toBe(true);
  });

  it('normaliza el teléfono local 0412 al formato almacenado +58412', () => {
    expect(matchesOrderQuery(buildOrder(), '04141234567')).toBe(true);
  });

  it('no coincide con términos ajenos al pedido', () => {
    expect(matchesOrderQuery(buildOrder(), 'zzzz')).toBe(false);
  });
});

describe('getOrderBoardKpis', () => {
  it('acumula pendientes, cocina, reparto y ventas del día', () => {
    const orders = [
      buildOrder({ id: 'a1', status: 'payment_pending', total_amount: '100.00' }),
      buildOrder({ id: 'b2', status: 'confirmed', total_amount: '50.00' }),
      buildOrder({ id: 'c3', status: 'preparing', total_amount: '20.00' }),
      buildOrder({ id: 'd4', status: 'ready', total_amount: '30.00' }),
      buildOrder({ id: 'e5', status: 'on_the_way', total_amount: '10.00' }),
      buildOrder({ id: 'f6', status: 'cancelled', total_amount: '999.00' }),
    ];

    const kpis = getOrderBoardKpis(orders, 10, NOW);

    expect(kpis.pendingPayment).toEqual({ count: 1, usd: 100, ves: 1000 });
    expect(kpis.kitchen).toEqual({ total: 2, inProgress: 1, queued: 1 });
    expect(kpis.dispatch).toEqual({ total: 2, ready: 1, onTheWay: 1 });
    expect(kpis.todaySales).toEqual({ count: 5, usd: 210, ves: 2100 });
  });

  it('deja las monedas en cero cuando la tasa BCV no ha cargado', () => {
    const kpis = getOrderBoardKpis([buildOrder()], 0, NOW);
    expect(kpis.pendingPayment.ves).toBe(0);
    expect(kpis.pendingPayment.usd).toBe(150);
  });

  it('excluye de las ventas del día los pedidos de días anteriores', () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString();
    const kpis = getOrderBoardKpis([buildOrder({ created_at: yesterday })], 10, NOW);
    expect(kpis.todaySales.count).toBe(0);
    expect(kpis.todaySales.usd).toBe(0);
  });
});

describe('countOrdersByTab', () => {
  it('cuenta cada grupo de estados sin solaparse', () => {
    const orders = [
      buildOrder({ id: 'a', status: 'payment_pending' }),
      buildOrder({ id: 'b', status: 'confirmed' }),
      buildOrder({ id: 'c', status: 'preparing' }),
      buildOrder({ id: 'd', status: 'ready' }),
      buildOrder({ id: 'e', status: 'on_the_way' }),
      buildOrder({ id: 'f', status: 'delivered' }),
      buildOrder({ id: 'g', status: 'cancelled' }),
    ];

    expect(countOrdersByTab(orders)).toEqual({
      all: 7,
      payment_pending: 1,
      kitchen: 2,
      dispatch: 2,
      delivered: 1,
      cancelled: 1,
    });
  });

  it('cuenta cero para un conjunto vacío', () => {
    expect(countOrdersByTab([])).toEqual({
      all: 0,
      payment_pending: 0,
      kitchen: 0,
      dispatch: 0,
      delivered: 0,
      cancelled: 0,
    });
  });
});

describe('filterOrdersByTab', () => {
  it('devuelve todo el listado para la pestaña "all"', () => {
    const orders = [buildOrder({ status: 'delivered' }), buildOrder({ status: 'ready' })];
    expect(filterOrdersByTab(orders, 'all')).toHaveLength(2);
  });

  it('agrupa confirmados y en preparación bajo "En Cocina"', () => {
    const orders = [
      buildOrder({ id: 'a', status: 'confirmed' }),
      buildOrder({ id: 'b', status: 'preparing' }),
      buildOrder({ id: 'c', status: 'delivered' }),
    ];
    expect(filterOrdersByTab(orders, 'kitchen').map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('expone la pestaña de Listos / Reparto con ready y on_the_way', () => {
    const tab = ORDER_BOARD_TABS.find((candidate) => candidate.key === 'dispatch');
    expect(tab?.statuses).toEqual(['ready', 'on_the_way']);
  });
});

describe('filterOrdersByFacets', () => {
  const orders = [
    buildOrder({ id: '845f-a', payment_method: 'pago_movil' }),
    buildOrder({
      id: 'aaaa-b',
      payment_method: 'cash',
      profiles: { full_name: 'Pedro', email: 'pedro@test.com' },
    }),
    buildOrder({
      id: 'cccc-c',
      payment_method: 'zelle',
      created_at: new Date(NOW.getTime() - 10 * 86_400_000).toISOString(),
    }),
  ];

  it('filtra por método de pago', () => {
    const result = filterOrdersByFacets(orders, {
      query: '',
      paymentMethod: 'cash',
      range: NO_RANGE,
    });
    expect(result.map((order) => order.id)).toEqual(['aaaa-b']);
  });

  it('filtra por período excluyendo pedidos antiguos', () => {
    const result = filterOrdersByFacets(orders, {
      query: '',
      paymentMethod: 'all',
      range: getOrderBoardDateRange('today', NOW),
    });
    expect(result.map((order) => order.id)).toEqual(['845f-a', 'aaaa-b']);
  });

  it('combina búsqueda y método de pago', () => {
    const result = filterOrdersByFacets(orders, {
      query: 'pedro',
      paymentMethod: 'pago_movil',
      range: NO_RANGE,
    });
    expect(result).toHaveLength(0);
  });
});

describe('collectAvailablePaymentMethods', () => {
  it('devuelve los métodos presentes sin duplicados', () => {
    const orders = [
      buildOrder({ payment_method: 'pago_movil' as PaymentMethod }),
      buildOrder({ payment_method: 'pago_movil' as PaymentMethod }),
      buildOrder({ payment_method: 'cash' as PaymentMethod }),
    ];
    expect(collectAvailablePaymentMethods(orders).sort()).toEqual(['cash', 'pago_movil']);
  });
});

describe('tipos de estado soportados', () => {
  it('cubre los siete estados de orden del flujo', () => {
    const covered = new Set<OrderStatus>();
    for (const tab of ORDER_BOARD_TABS) {
      for (const status of tab.statuses ?? []) covered.add(status);
    }
    expect(covered).toEqual(
      new Set<OrderStatus>([
        'payment_pending',
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'delivered',
        'cancelled',
      ]),
    );
  });
});
