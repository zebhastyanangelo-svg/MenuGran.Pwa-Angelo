/**
 * Push de cambios de estado de un pedido hacia su cliente.
 *
 * Punto único de despacho: tanto el panel del comercio como el repartidor
 * actualizan el estado de pedidos en distintos hooks; todos terminan aquí
 * para que el cliente reciba el aviso como recordatorio activo en todos sus
 * dispositivos —con la app cerrada o la pantalla bloqueada— vía Web Push.
 *
 * El envío es "fire-and-forget": si falla (sin suscripción, red caída) el
 * flujo del comercio no se rompe, porque la actualización de la orden ya
 * ocurrió.
 */

import type { OrderStatus } from '../types/database';
import { sendOrderCustomerStatusPush } from './pushNotificationService';

const ORDER_STATUS_PUSH_COPY: Record<OrderStatus, { title: string; body: string }> = {
  payment_pending: {
    title: 'Pedido pendiente',
    body: 'Tu pago aún no ha sido confirmado.',
  },
  confirmed: {
    title: 'Pedido confirmado',
    body: 'El comercio ha confirmado tu pedido.',
  },
  preparing: {
    title: 'En preparación',
    body: 'Tu pedido está siendo preparado.',
  },
  ready: {
    title: 'Listo para recoger',
    body: 'Tu pedido está listo. Ya puedes retirarlo.',
  },
  on_the_way: {
    title: 'Pedido en camino',
    body: 'Tu repartidor va en camino a tu dirección.',
  },
  delivered: {
    title: 'Pedido entregado',
    body: 'Tu pedido ha sido entregado. ¡Que lo disfrutes!',
  },
  cancelled: {
    title: 'Pedido cancelado',
    body: 'Tu pedido fue cancelado. Revisa el detalle para más información.',
  },
};

/** Copy del aviso push para un estado de orden. */
export function buildOrderStatusPushCopy(status: OrderStatus): { title: string; body: string } {
  return ORDER_STATUS_PUSH_COPY[status];
}

/**
 * Notifica al cliente el nuevo estado de su pedido.
 *
 * Nunca lanza: un fallo del push no debe revertir ni ensuciar la actualización
 * del pedido que el comercio o el repartidor ya confirmaron.
 */
export async function dispatchOrderStatusPushToCustomer(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  try {
    const copy = buildOrderStatusPushCopy(status);
    const result = await sendOrderCustomerStatusPush(orderId, copy.title, copy.body);
    if (!result.ok) {
      console.warn('[orderStatusPush] no se pudo notificar al cliente:', result.message);
    }
  } catch (err) {
    console.warn('[orderStatusPush] fallo despachando el push:', err);
  }
}
