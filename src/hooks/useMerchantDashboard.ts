import { useEffect, useRef } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderRow, OrderStatus } from '../types/database'
import type { DriverProfile, OrderWithCustomer } from './useMerchantDashboardPage'

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
  drivers: DriverProfile[]
  loading: boolean
  error: string | null
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  assignDriver: (orderId: string, driverId: string | null) => Promise<void>
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

  const { data: drivers = [] } = useQuery<DriverProfile[]>({
    queryKey: ['merchantDrivers', merchantIds.join('-')],
    enabled: merchantIds.length > 0,
    queryFn: async (): Promise<DriverProfile[]> => {
      const result = await supabase
        .from(TABLE_NAMES.merchantStaff)
        .select('user_id, profiles!user_id(full_name, email)')
        .in('merchant_id', merchantIds)
        .eq('is_active', true)
        .eq('role', 'driver')
      if (result.error) throw result.error
      return (result.data ?? []).map(
        (row: Record<string, unknown>) => ({
          id: row.user_id as string,
          full_name: ((row.profiles as Record<string, unknown>)?.full_name as string) ?? null,
          email: ((row.profiles as Record<string, unknown>)?.email as string) ?? null,
        }),
      )
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

  const { mutateAsync: assignDriver } = useMutation<
    void,
    Error,
    { orderId: string; driverId: string | null },
    unknown
  >({
    mutationKey: ['assignDriver'],
    mutationFn: async ({ orderId, driverId }) => {
      const result = await supabase
        .from(TABLE_NAMES.orders)
        .update({ driver_id: driverId })
        .eq('id', orderId)
      if (result.error) throw result.error

      if (driverId) {
        const { data: existing } = await supabase
          .from(TABLE_NAMES.deliveries)
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle()

        if (existing?.id) {
          const updateResult = await supabase
            .from(TABLE_NAMES.deliveries)
            .update({ driver_id: driverId, status: 'assigned' })
            .eq('id', existing.id)
          if (updateResult.error) throw updateResult.error
        } else {
          const insertResult = await supabase
            .from(TABLE_NAMES.deliveries)
            .insert({ order_id: orderId, driver_id: driverId, status: 'assigned' })
          if (insertResult.error) throw insertResult.error
        }
      } else {
        const { data: existing } = await supabase
          .from(TABLE_NAMES.deliveries)
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle()
        if (existing?.id) {
          const updateResult = await supabase
            .from(TABLE_NAMES.deliveries)
            .update({ driver_id: null, status: 'unassigned' })
            .eq('id', existing.id)
          if (updateResult.error) throw updateResult.error
        }
      }
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
    drivers: drivers ?? [],
    loading: isLoading,
    error: isError ? getErrorMessage(error) : null,
    updateOrderStatus: async (orderId: string, status: OrderStatus) =>
      await updateOrderStatus({ orderId, status }),
    assignDriver: async (orderId: string, driverId: string | null) =>
      await assignDriver({ orderId, driverId }),
  }
}

export { PAYMENT_PROOF_BUCKET }