import { useEffect, useRef } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderRow, OrderStatus } from '../types/database'

const PAYMENT_PROOF_BUCKET = 'payment-proofs'

export interface MerchantDashboardData {
  merchantIds: string[]
  orders: OrderRow[]
  loading: boolean
  error: string | null
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
}

async function fetchMerchantIds(user: User): Promise<string[]> {
  const ids: string[] = []

  const owner = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_active', true)
  if (!owner.error && Array.isArray(owner.data)) {
    owner.data.forEach((row) => row?.id && ids.push(row.id))
  }

  const staff = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('merchant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
  if (!staff.error && Array.isArray(staff.data)) {
    staff.data.forEach((row) => row?.merchant_id && ids.push(row.merchant_id))
  }

  return [...new Set(ids)]
}

async function fetchOrders(ids: string[]): Promise<OrderRow[]> {
  if (ids.length === 0) return []
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .select('*')
    .in('merchant_id', ids)
    .order('created_at', { ascending: false })
  if (result.error) throw result.error
  return result.data ?? []
}

export function useMerchantDashboard(user: User | null): MerchantDashboardData {
  const queryClient = useQueryClient()

  const { data: merchantIds = [] } = useQuery<string[]>({
    queryKey: ['merchantIds', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      if (!user) return []
      return fetchMerchantIds(user)
    },
  })

  const { data: orders = [], isLoading, isError, error } = useQuery<OrderRow[]>({
    queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
    enabled: !!user && merchantIds.length > 0,
    queryFn: async (): Promise<OrderRow[]> => {
      if (!user || merchantIds.length === 0) return []
      return fetchOrders(merchantIds)
    },
  })

  const { mutateAsync: updateOrderStatus } = useMutation<
    void,
    Error,
    { orderId: string; status: OrderStatus },
    unknown
  >({
    mutationKey: ['updateOrderStatus'],
    mutationFn: async ({ orderId, status }) => {
      const result = await supabase
        .from(TABLE_NAMES.orders)
        .update({ status })
        .eq('id', orderId)
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
      })
    },
  })

  // Realtime subscription for order changes
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (merchantIds.length === 0 || !user) return undefined

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
        () => {
          queryClient.invalidateQueries({
            queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
          })
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [merchantIds, user?.id, queryClient])

  return {
    merchantIds,
    orders: orders ?? [],
    loading: isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    updateOrderStatus: async (orderId: string, status: OrderStatus) =>
      await updateOrderStatus({ orderId, status }),
  }
}

export { PAYMENT_PROOF_BUCKET }