import type { OrderStatus } from '../../types/database';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '../../utils/orderStatus';

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeClass(
        status
      )}`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}
