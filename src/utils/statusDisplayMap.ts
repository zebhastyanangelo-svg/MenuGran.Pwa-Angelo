import type { OrderStatus } from '../types/database';

export const statusDisplayMap: Record<OrderStatus, string> = {
  payment_pending: 'Pendiente de pago',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
