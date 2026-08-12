import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { OrderRow, OrderStatus } from '../types/database';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

export interface MerchantDashboardData {
  merchantIds: string[];
  orders: OrderRow[];
  loading: boolean;
  error: string | null;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

async function fetchMerchantIds(user: User): Promise<string[]> {
  const ids: string[] = [];

  const owner = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_active', true);
  if (!owner.error && Array.isArray(owner.data)) {
    owner.data.forEach((row) => row?.id && ids.push(row.id));
  }

  const staff = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('merchant_id')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (!staff.error && Array.isArray(staff.data)) {
    staff.data.forEach((row) => row?.merchant_id && ids.push(row.merchant_id));
  }

  return [...new Set(ids)];
}

async function fetchOrders(ids: string[]): Promise<OrderRow[]> {
  if (ids.length === 0) return [];
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .select('*')
    .in('merchant_id', ids)
    .order('created_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export function useMerchantDashboard(user: User | null): MerchantDashboardData {
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setMerchantIds([]);
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ids = await fetchMerchantIds(user);
      setMerchantIds(ids);
      setOrders(await fetchOrders(ids));
    } catch (err: unknown) {
      console.error('Error cargando panel del comercio:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el panel');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (merchantIds.length === 0) return;
    if (typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel(`merchant-orders-${merchantIds.join('-')}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAMES.orders,
          filter: `merchant_id=in.(${merchantIds.join(',')})`,
        },
        (payload) => applyRealtimeChange(payload, setOrders)
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [merchantIds]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const result = await supabase
        .from(TABLE_NAMES.orders)
        .update({ status })
        .eq('id', orderId);
      if (result.error) throw result.error;
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    },
    []
  );

  return { merchantIds, orders, loading, error, updateOrderStatus };
}

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: OrderRow;
  old: Partial<OrderRow>;
};

function applyRealtimeChange(
  payload: { eventType: string; new: unknown; old: unknown },
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>
): void {
  const change = payload as RealtimePayload;
  if (change.eventType === 'INSERT') {
    setOrders((prev) => [change.new, ...prev]);
    return;
  }
  if (change.eventType === 'UPDATE') {
    setOrders((prev) =>
      prev.map((order) => (order.id === change.new.id ? change.new : order))
    );
    return;
  }
  if (change.eventType === 'DELETE') {
    setOrders((prev) =>
      prev.filter((order) => order.id !== change.old.id)
    );
  }
}

export { PAYMENT_PROOF_BUCKET };
