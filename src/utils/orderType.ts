import type { OrderType } from '../types/database';

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  in_store: 'Comer en el local',
  pickup: 'Retiro en local',
  delivery: 'Delivery',
};

export function getOrderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_LABELS[type] ?? type;
}

export default getOrderTypeLabel;
