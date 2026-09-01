import { useState, useEffect, useMemo } from 'react';
import { getLastOrder, saveOrder } from '../utils/offlineStorage';
import { supabase } from '../services/supabase';
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

  // Subscribe to Realtime changes on the cached order so the banner
  // disappears immediately when status becomes delivered / cancelled.
  useEffect(() => {
    if (!cachedOrder) return;

    const channel = supabase
      .channel(`active-order-banner-${cachedOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${cachedOrder.id}`,
        },
        (payload) => {
          const updated = payload.new as OrderRow;
          setCachedOrder(updated);
          saveOrder(updated);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cachedOrder?.id]);

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