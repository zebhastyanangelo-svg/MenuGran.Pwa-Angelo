import { useEffect } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { fetchMerchantDrivers } from '../services/merchantStaffService'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { OrderRow, OrderStatus } from '../types/database'
import type { DriverProfile, OrderWithCustomer } from './useMerchantDashboardPage'
import {
  mergeRealtimeOrderUpdate,
  parseRealtimeOrderUpdate,
} from '../utils/realtimeOrders'

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

type MerchantOrdersQueryKey = readonly ['merchantOrders', string, string]

interface MerchantRealtimeHandlers {
  onInsert: (payload: unknown) => void
  onUpdate: (payload: unknown) => void
}

let merchantOrdersSubscriptionCounter = 0

function buildOrdersRealtimeConfig(
  event: 'INSERT' | 'UPDATE',
  realtimeFilter: string,
): {
  event: 'INSERT' | 'UPDATE'
  schema: 'public'
  table: typeof TABLE_NAMES.orders
  filter: string
} {
  return {
    event,
    schema: 'public',
    table: TABLE_NAMES.orders,
    filter: realtimeFilter,
  }
}

function subscribeToMerchantOrders(
  merchantIds: readonly string[],
  subscriptionIndex: number,
  handlers: MerchantRealtimeHandlers,
): RealtimeChannel {
  const channelName = `merchant-orders-${merchantIds.join('-')}-${subscriptionIndex}`
  const realtimeFilter = `merchant_id=in.(${merchantIds.join(',')})`
  const insertConfig = buildOrdersRealtimeConfig('INSERT', realtimeFilter)
  const updateConfig = buildOrdersRealtimeConfig('UPDATE', realtimeFilter)
  return supabase
    .channel(channelName)
    .on('postgres_changes', insertConfig, (payload) => handlers.onInsert(payload))
    .on('postgres_changes', updateConfig, (payload) => handlers.onUpdate(payload))
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(
          '[merchant-orders] suscripción realtime falló:',
          error?.message ?? status,
        )
      }
    })
}

function applyRealtimeOrderUpdate(
  payload: unknown,
  queryClient: QueryClient,
  ordersQueryKey: MerchantOrdersQueryKey,
): void {
  const update = parseRealtimeOrderUpdate(payload)
  if (update) {
    queryClient.setQueryData<OrderWithCustomer[]>(ordersQueryKey, (current) =>
      mergeRealtimeOrderUpdate(current ?? [], update),
    )
  }
  void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
}

function handleRealtimeOrderInsert(
  payload: unknown,
  queryClient: QueryClient,
  ordersQueryKey: MerchantOrdersQueryKey,
  onNewOrder?: (order: OrderRow) => void,
): void {
  void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
  const inserted = parseRealtimeOrderUpdate(payload)
  if (inserted?.status === 'payment_pending') {
    onNewOrder?.(inserted as unknown as OrderRow)
  }
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
    queryFn: async (): Promise<DriverProfile[]> =>
      fetchMerchantDrivers(merchantIds),
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

  const userId = user?.id
  const onNewOrder = options?.onNewOrder

  useEffect(() => {
    if (merchantIds.length === 0 || userId === undefined) return undefined

    merchantOrdersSubscriptionCounter += 1
    const ordersQueryKey = [
      'merchantOrders',
      userId,
      merchantIds.join('-'),
    ] as const
    const channel = subscribeToMerchantOrders(
      merchantIds,
      merchantOrdersSubscriptionCounter,
      {
        onInsert: (payload) =>
          handleRealtimeOrderInsert(payload, queryClient, ordersQueryKey, onNewOrder),
        onUpdate: (payload) =>
          applyRealtimeOrderUpdate(payload, queryClient, ordersQueryKey),
      },
    )

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [merchantIds, userId, queryClient, onNewOrder])

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