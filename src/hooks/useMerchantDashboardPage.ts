import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, TABLE_NAMES } from '../services/supabase';
import { useMerchantDashboard } from './useMerchantDashboard';
import type { OrderRow, OrderStatus } from '../types/database';

export interface MerchantDashboardPageData {
  merchantId: string | null;
  merchantName: string | null;
  isOpen: boolean;
  activeProducts: number;
  orders: OrderRow[];
  loading: boolean;
  error: string | null;
  toggleStoreOpen: (open: boolean) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export function useMerchantDashboardPage(
  user: User | null,
): MerchantDashboardPageData {
  const { merchantIds, orders, loading, error, updateOrderStatus } =
    useMerchantDashboard(user);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeProducts, setActiveProducts] = useState(0);
  const merchantId = merchantIds[0] ?? null;

  useEffect(() => {
    if (!merchantId) {
      setMerchantName(null);
      setIsOpen(false);
      setActiveProducts(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [merchantResult, productsResult] = await Promise.all([
          supabase
            .from(TABLE_NAMES.merchants)
            .select('name, is_open')
            .eq('id', merchantId)
            .single(),
          supabase
            .from(TABLE_NAMES.products)
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchantId)
            .eq('is_available', true),
        ]);
        if (cancelled) return;
        const merchant = merchantResult.data as
          | { name: string; is_open: boolean }
          | null;
        if (merchant) {
          setMerchantName(merchant.name);
          setIsOpen(merchant.is_open);
        }
        setActiveProducts(productsResult.count ?? 0);
      } catch {
        // Silencioso: el panel ya muestra errores de pedidos independientemente.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  const toggleStoreOpen = useCallback(
    async (open: boolean) => {
      if (!merchantId) return;
      setIsOpen(open);
      const result = await supabase
        .from(TABLE_NAMES.merchants)
        .update({ is_open: open })
        .eq('id', merchantId);
      if (result.error) throw result.error;
    },
    [merchantId],
  );

  return {
    merchantId,
    merchantName,
    isOpen,
    activeProducts,
    orders,
    loading,
    error,
    toggleStoreOpen,
    updateOrderStatus,
  };
}
