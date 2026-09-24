import { describe, expect, it } from 'vitest';
import {
  mergeRealtimeOrderUpdate,
  parseRealtimeOrderUpdate,
} from './realtimeOrders';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
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
    ...overrides,
  };
}

describe('parseRealtimeOrderUpdate', () => {
  it('acepta un payload UPDATE con id y estado delivered', () => {
    const update = parseRealtimeOrderUpdate({
      new: { id: 'order-1', status: 'delivered' },
    });
    expect(update).toEqual({ id: 'order-1', status: 'delivered' });
  });

  it('acepta actualizaciones parciales que no incluyen estado', () => {
    const update = parseRealtimeOrderUpdate({
      new: { id: 'order-1', driver_id: 'driver-9' },
    });
    expect(update).toEqual({ id: 'order-1', driver_id: 'driver-9' });
  });

  it('rechaza payloads sin id válido', () => {
    expect(parseRealtimeOrderUpdate({ new: { status: 'delivered' } })).toBeNull();
    expect(parseRealtimeOrderUpdate({ new: { id: '' } })).toBeNull();
  });

  it('rechaza payloads malformados sin lanzar excepciones', () => {
    expect(parseRealtimeOrderUpdate(null)).toBeNull();
    expect(parseRealtimeOrderUpdate(undefined)).toBeNull();
    expect(parseRealtimeOrderUpdate('delivered')).toBeNull();
    expect(parseRealtimeOrderUpdate({})).toBeNull();
    expect(parseRealtimeOrderUpdate({ new: null })).toBeNull();
  });

  it('rechaza estados que no pertenecen al ciclo de vida de pedidos', () => {
    expect(
      parseRealtimeOrderUpdate({ new: { id: 'order-1', status: 'not_a_status' } }),
    ).toBeNull();
  });
});

describe('mergeRealtimeOrderUpdate', () => {
  it('aplica el estado delivered sobre la orden coincidente', () => {
    const orders = [buildOrder()];
    const next = mergeRealtimeOrderUpdate(orders, {
      id: 'order-1',
      status: 'delivered',
    });
    expect(next[0].status).toBe('delivered');
  });

  it('preserva los campos previos no incluidos en el payload', () => {
    const orders = [buildOrder()];
    const next = mergeRealtimeOrderUpdate(orders, {
      id: 'order-1',
      status: 'delivered',
    });
    expect(next[0].total_amount).toBe('150.00');
    expect(next[0].profiles).toEqual({
      full_name: 'Cliente Prueba',
      email: 'cliente@test.com',
    });
  });

  it('no muta la lista original', () => {
    const orders = [buildOrder()];
    mergeRealtimeOrderUpdate(orders, { id: 'order-1', status: 'delivered' });
    expect(orders[0].status).toBe('on_the_way');
  });

  it('devuelve la misma referencia cuando la orden no está en caché', () => {
    const orders: OrderWithCustomer[] = [buildOrder()];
    const next = mergeRealtimeOrderUpdate(orders, {
      id: 'order-desconocida',
      status: 'delivered',
    });
    expect(next).toBe(orders);
  });

  it('actualiza solo la orden afectada dentro de la lista', () => {
    const orders = [
      buildOrder({ id: 'order-a', status: 'preparing' }),
      buildOrder({ id: 'order-b', status: 'on_the_way' }),
      buildOrder({ id: 'order-c', status: 'ready' }),
    ];
    const next = mergeRealtimeOrderUpdate(orders, {
      id: 'order-b',
      status: 'delivered',
    });
    expect(next.map((order) => order.status)).toEqual([
      'preparing',
      'delivered',
      'ready',
    ]);
  });
});
