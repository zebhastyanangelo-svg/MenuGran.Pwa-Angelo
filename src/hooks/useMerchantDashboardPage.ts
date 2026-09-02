import { useEffect, useRef, useState } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderRow, OrderStatus } from '../types/database'

export interface CustomerProfile {
  full_name: string | null
  email: string | null
}

export interface OrderWithCustomer extends OrderRow {
  profiles?: CustomerProfile | null
}

export interface DriverProfile {
  id: string
  full_name: string | null
  email: string | null
}

export interface MerchantDashboardPageData {
  merchantId: string | null
  merchantName: string | null
  isOpen: boolean
  activeProducts: number
  orders: OrderWithCustomer[]
  drivers: DriverProfile[]
  loading: boolean
  error: string | null
  toggleStoreOpen: (open: boolean) => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  assignDriver: (orderId: string, driverId: string | null) => Promise<void>
}

export interface UseMerchantDashboardPageOptions {
  onNewOrder?: (order: OrderRow) => void
}

export function useMerchantDashboardPage(
  user: User | null,
  options?: UseMerchantDashboardPageOptions,
): MerchantDashboardPageData {
  const queryClient = useQueryClient()

  const { data: merchantIds = [] } = useQuery<string[]>({
    queryKey: ['merchantIds', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      if (!user) return []

      const [ownerResult, staffResult] = await Promise.all([
        supabase
          .from(TABLE_NAMES.merchants)
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true),
        supabase
          .from(TABLE_NAMES.merchantStaff)
          .select('merchant_id')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

      const ids: string[] = []
      if (!ownerResult.error && Array.isArray(ownerResult.data)) {
        ownerResult.data.forEach((row) => row?.id && ids.push(row.id))
      }
      if (!staffResult.error && Array.isArray(staffResult.data)) {
        staffResult.data.forEach((row) => row?.merchant_id && ids.push(row.merchant_id))
      }
      return [...new Set(ids)]
    },
  })

  const { data: orders = [], isLoading, isError, error } = useQuery<OrderWithCustomer[]>({
    queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
    enabled: !!user && merchantIds.length > 0,
    queryFn: async (): Promise<OrderWithCustomer[]> => {
      if (!user || merchantIds.length === 0) return []
      const result = await supabase
        .from(TABLE_NAMES.orders)
        .select('*, profiles!customer_id(full_name, email)')
        .in('merchant_id', merchantIds)
        .order('created_at', { ascending: false })
      if (result.error) throw result.error
      return (result.data ?? []) as OrderWithCustomer[]
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

  const [merchantName, setMerchantName] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeProducts, setActiveProducts] = useState(0)

  useEffect(() => {
    if (!merchantIds[0]) {
      setMerchantName(null)
      setIsOpen(false)
      setActiveProducts(0)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const [merchantResult, productsResult] = await Promise.all([
          supabase
            .from(TABLE_NAMES.merchants)
            .select('name, is_open')
            .eq('id', merchantIds[0])
            .single(),
          supabase
            .from(TABLE_NAMES.products)
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', merchantIds[0])
            .eq('is_available', true),
        ])
        if (cancelled) return
        if (merchantResult.error || productsResult.error) return

        const merchant = merchantResult.data as
          | { name: string; is_open: boolean }
          | null
        if (merchant) {
          setMerchantName(merchant.name)
          setIsOpen(merchant.is_open)
        }
        setActiveProducts(productsResult.count ?? 0)
      } catch {
        // Silencioso: el panel ya muestra errores de pedidos independientemente.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [merchantIds])

  const { mutateAsync: toggleStoreOpen, isPending: isToggling } = useMutation<
    void,
    Error,
    boolean,
    unknown
  >({
    mutationKey: ['toggleStoreOpen'],
    mutationFn: async (open: boolean) => {
      if (!merchantIds?.[0]) return
      const result = await supabase
        .from(TABLE_NAMES.merchants)
        .update({ is_open: open })
        .eq('id', merchantIds[0])
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['merchantOrders', user?.id, merchantIds.join('-')],
      })
    },
  })

  const { mutateAsync: updateOrderStatus, isPending: isUpdating } = useMutation<
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
    if (merchantIds.length === 0) return undefined

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
    merchantId: merchantIds[0] ?? null,
    merchantName,
    isOpen,
    activeProducts,
    orders: orders ?? [],
    drivers: drivers ?? [],
    loading: isLoading || isToggling || isUpdating,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    toggleStoreOpen: async (open: boolean) => await toggleStoreOpen(open),
    updateOrderStatus: async (orderId: string, status: OrderStatus) =>
      await updateOrderStatus({ orderId, status }),
    assignDriver: async (orderId: string, driverId: string | null) =>
      await assignDriver({ orderId, driverId }),
  }
}

export default useMerchantDashboardPage
