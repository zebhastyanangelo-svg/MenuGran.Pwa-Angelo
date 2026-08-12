import type { OrderStatus } from '../types/database';

export const ORDER_STATUS_ORDER: readonly OrderStatus[] = [
  'payment_pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
  'cancelled',
];

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'payment_pending':
      return 'Pendiente de Pago';
    case 'confirmed':
      return 'Confirmado';
    case 'preparing':
      return 'En Preparación';
    case 'ready':
      return 'Listo';
    case 'on_the_way':
      return 'En Camino';
    case 'delivered':
      return 'Entregado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

export function getOrderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'payment_pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'preparing':
      return 'bg-indigo-100 text-indigo-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'on_the_way':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getAllowedTransitions(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'payment_pending':
      return ['confirmed', 'cancelled'];
    case 'confirmed':
      return ['preparing', 'cancelled'];
    case 'preparing':
      return ['ready'];
    case 'ready':
      return ['on_the_way'];
    case 'on_the_way':
      return ['delivered'];
    default:
      return [];
  }
}

export function getTransitionLabel(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Aceptar pago';
    case 'preparing':
      return 'Marcar como preparando';
    case 'ready':
      return 'Marcar como listo';
    case 'on_the_way':
      return 'Enviar para entrega';
    case 'delivered':
      return 'Marcar como entregado';
    case 'cancelled':
      return 'Rechazar';
    default:
      return status;
  }
}

export function getTransitionButtonClass(status: OrderStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-600 text-white hover:bg-green-700';
    case 'preparing':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'ready':
      return 'bg-indigo-600 text-white hover:bg-indigo-700';
    case 'on_the_way':
      return 'bg-purple-600 text-white hover:bg-purple-700';
    case 'delivered':
      return 'bg-emerald-600 text-white hover:bg-emerald-700';
    case 'cancelled':
      return 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
    default:
      return 'bg-gray-600 text-white hover:bg-gray-700';
  }
}
