import { useEffect, useRef } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderRow, OrderStatus } from '../types/database'
import type { OrderWithCustomer } from './useMerchantDashboardPage'

const PAYMENT_PROOF_BUCKET = 'payment-proofs'

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

export interface MerchantDashboardData {
  merchantIds: string[]
  orders: OrderWithCustomer[]
  loading: boolean
  error: string | null
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
}

export interface UseMerchantDashboardOptions {
  onNewOrder?: (order: OrderRow) => void
}

async function fetchMerchantIds(user: User): Promise<string[]> {
  const ids: string[] = []

  const owner = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id, owner_id, name, is_active')
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

async function fetchOrders(ids: string[]): Promise<OrderWithCustomer[]> {
  if (ids.length === 0) return []
  const result = await supabase
    .from(TABLE_NAMES.orders)
     .select('id, merchant_id, customer_id, driver_id, type, status, payment_method, payment_reference, payment_proof_url, total_amount, table_number, delivery_location, delivery_address_notes, items, created_at, profiles!customer_id(full_name, email)')
    .in('merchant_id', ids)
    .order('created_at', { ascending: false })
  if (result.error) throw result.error
  return (result.data ?? []) as unknown as OrderWithCustomer[]
}

export function useMerchantDashboard(
  user: User | null,
  options?: UseMerchantDashboardOptions,
): MerchantDashboardData {
  const queryClient = useQueryClient()

  const { data: merchantIds = [] } = useQuery<string[]>({
    queryKey: ['merchantIds', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      if (!user) return []
      return fetchMerchantIds(user)
    },
  })

  const { data: orders = [], isLoading, isError, error } = useQuery<OrderWithCustomer[]>({
    queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
    enabled: !!user && merchantIds.length > 0,
    queryFn: async (): Promise<OrderWithCustomer[]> => {
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
          event: 'INSERT',
          schema: 'public',
          table: TABLE_NAMES.orders,
          filter: `merchant_id=in.(${merchantIds.join(',')})`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
          })
          const newOrder = payload.new as OrderRow | undefined
          if (newOrder && newOrder.status === 'payment_pending') {
            options?.onNewOrder?.(newOrder)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
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
  }, [merchantIds, user?.id, queryClient, options?.onNewOrder])

  return {
    merchantIds,
    orders: orders ?? [],
    loading: isLoading,
    error: isError ? getErrorMessage(error) : null,
    updateOrderStatus: async (orderId: string, status: OrderStatus) =>
      await updateOrderStatus({ orderId, status }),
  }
}

export { PAYMENT_PROOF_BUCKET }