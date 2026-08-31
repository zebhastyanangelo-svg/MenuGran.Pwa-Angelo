import { useState, useEffect, useMemo } from 'react';
import { getLastOrder } from '../utils/offlineStorage';
import type { OrderRow, OrderStatus } from '../types/database';

const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'payment_pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
];

export interface ActiveOrderInfo {
  order: OrderRow | null;
  isActive: boolean;
  status: OrderStatus | null;
}

export function useActiveOrder(): ActiveOrderInfo {
  const [cachedOrder, setCachedOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    const lastOrder = getLastOrder();
    if (lastOrder) {
      setCachedOrder(lastOrder);
    }
  }, []);

  const info = useMemo<ActiveOrderInfo>(() => {
    const order = cachedOrder;
    if (!order) {
      return { order: null, isActive: false, status: null };
    }
    const isActive = ACTIVE_STATUSES.includes(order.status);
    return {
      order,
      isActive,
      status: isActive ? order.status : null,
    };
  }, [cachedOrder]);

  return info;
}

export function isActiveOrder(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}