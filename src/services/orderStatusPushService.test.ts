import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildOrderStatusPushCopy,
  dispatchOrderStatusPushToCustomer,
} from './orderStatusPushService';
import * as pushNotificationService from './pushNotificationService';
import type { OrderStatus } from '../types/database';

vi.mock('./pushNotificationService', () => ({
  sendOrderCustomerStatusPush: vi.fn().mockResolvedValue({ ok: true, summary: { sent: 1, failed: 0, deleted: 0, total: 1 } }),
}));

const sendOrderCustomerStatusPushMock = vi.mocked(
  pushNotificationService.sendOrderCustomerStatusPush,
);

describe('buildOrderStatusPushCopy', () => {
  it('tiene copy para cada estado de orden', () => {
    const statuses: OrderStatus[] = [
      'payment_pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
    ];

    for (const status of statuses) {
      const copy = buildOrderStatusPushCopy(status);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });
});

describe('dispatchOrderStatusPushToCustomer', () => {
  beforeEach(() => {
    sendOrderCustomerStatusPushMock.mockClear();
  });

  it('envía el push con el copy del estado', async () => {
    await dispatchOrderStatusPushToCustomer('order-1', 'on_the_way');

    expect(sendOrderCustomerStatusPushMock).toHaveBeenCalledTimes(1);
    const [orderId, title, body] = sendOrderCustomerStatusPushMock.mock.calls[0];
    expect(orderId).toBe('order-1');
    expect(title).toBe('Pedido en camino');
    expect(body.length).toBeGreaterThan(0);
  });

  it('no lanza cuando el envío falla', async () => {
    sendOrderCustomerStatusPushMock.mockResolvedValueOnce({
      ok: false,
      message: 'Sin suscripción',
    });

    await expect(dispatchOrderStatusPushToCustomer('order-1', 'ready')).resolves.toBeUndefined();
  });

  it('no lanza cuando la invocación revienta', async () => {
    sendOrderCustomerStatusPushMock.mockRejectedValueOnce(new Error('network down'));

    await expect(dispatchOrderStatusPushToCustomer('order-1', 'delivered')).resolves.toBeUndefined();
  });
});
