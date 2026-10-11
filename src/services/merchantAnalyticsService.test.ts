import { describe, expect, it } from 'vitest';
import {
  computeLoyaltyMetrics,
  type OrderAnalyticsRow,
} from './merchantAnalyticsService';

function order(overrides: Partial<OrderAnalyticsRow> = {}): OrderAnalyticsRow {
  return {
    created_at: '2026-08-22T12:00:00.000Z',
    total_amount: '20',
    status: 'delivered',
    customer_id: 'c-1',
    ...overrides,
  };
}

describe('computeLoyaltyMetrics', () => {
  it('identifica clientes frecuentes y calcula la tasa de recompra', () => {
    const metrics = computeLoyaltyMetrics([
      order({ customer_id: 'c-1' }),
      order({ customer_id: 'c-1' }),
      order({ customer_id: 'c-2' }),
      order({ customer_id: 'c-3' }),
      order({ customer_id: 'c-3' }),
      order({ customer_id: 'c-4' }),
    ]);

    expect(metrics.totalCustomers).toBe(4);
    expect(metrics.returningCustomers).toBe(2);
    expect(metrics.repurchaseRate).toBe(50);
  });

  it('excluye pedidos cancelados de recompra y del ticket promedio', () => {
    const metrics = computeLoyaltyMetrics([
      order({ customer_id: 'c-1', total_amount: '30' }),
      order({ customer_id: 'c-1', total_amount: '50', status: 'cancelled' }),
    ]);

    // Solo 1 pedido válido: c-1 no es cliente frecuente.
    expect(metrics.totalCustomers).toBe(1);
    expect(metrics.returningCustomers).toBe(0);
    expect(metrics.repurchaseRate).toBe(0);
    expect(metrics.averageTicket).toBe(30);
  });

  it('calcula el ticket promedio sobre pedidos válidos', () => {
    const metrics = computeLoyaltyMetrics([
      order({ customer_id: 'c-1', total_amount: '10' }),
      order({ customer_id: 'c-2', total_amount: '30' }),
    ]);

    expect(metrics.averageTicket).toBe(20);
  });

  it('ignora pedidos sin cliente identificable para la recompra, no para el ticket', () => {
    const metrics = computeLoyaltyMetrics([
      order({ customer_id: null, total_amount: '40' }),
      order({ customer_id: null, total_amount: '20' }),
    ]);

    expect(metrics.totalCustomers).toBe(0);
    expect(metrics.repurchaseRate).toBe(0);
    expect(metrics.averageTicket).toBe(30);
  });

  it('devuelve ceros con la lista vacía', () => {
    expect(computeLoyaltyMetrics([])).toEqual({
      totalCustomers: 0,
      returningCustomers: 0,
      repurchaseRate: 0,
      averageTicket: 0,
    });
  });

  it('redondea la tasa de recompra al entero más cercano', () => {
    const metrics = computeLoyaltyMetrics([
      order({ customer_id: 'c-1' }),
      order({ customer_id: 'c-2' }),
      order({ customer_id: 'c-3' }),
    ]);

    expect(metrics.repurchaseRate).toBe(0);
  });
});
