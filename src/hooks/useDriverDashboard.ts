import { useCallback, useEffect, useRef, useState } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import type { OrderRow, OrderStatus } from '../types/database'

export interface DriverCustomerProfile {
  full_name: string | null
  email: string | null
  phone: string | null
}

export interface DriverOrder extends OrderRow {
  profiles?: DriverCustomerProfile | null
}

export interface DriverDashboardData {
  merchantId: string | null
  merchantName: string | null
  orders: DriverOrder[]
  loading: boolean
  error: string | null
  actionLoading: boolean
  actionError: string | null
  takeOrder: (orderId: string) => Promise<void>
  startDelivery: (orderId: string) => Promise<void>
  markDelivered: (orderId: string) => Promise<void>
  refresh: () => void
}

export interface UseDriverDashboardOptions {
  onNewReadyOrder?: (order: DriverOrder) => void
}

interface MerchantStaffWithMerchant {
  merchant_id: string
  merchants: { id: string; name: string } | null
}

async function fetchDriverMerchant(
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const result = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('merchant_id, merchants(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (result.error || !result.data) return null
  const row = result.data as unknown as MerchantStaffWithMerchant
  if (!row.merchants) return null
  return { id: row.merchants.id, name: row.merchants.name }
}

async function fetchDriverOrders(
  merchantId: string,
  userId: string,
): Promise<DriverOrder[]> {
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .select('*, profiles!customer_id(full_name, email, phone)')
    .eq('merchant_id', merchantId)
    .or(
      `and(status.eq.ready,or(driver_id.is.null,driver_id.eq.${userId})),and(status.eq.on_the_way,driver_id.eq.${userId})`,
    )
    .order('created_at', { ascending: false })
  if (result.error) throw result.error
  return (result.data ?? []) as DriverOrder[]
}

async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  driverId?: string | null,
): Promise<void> {
  const update: Record<string, unknown> = { status }
  if (driverId !== undefined) {
    update.driver_id = driverId
  }
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .update(update)
    .eq('id', orderId)
  if (result.error) throw result.error
}

export function useDriverDashboard(
  user: User | null,
  options?: UseDriverDashboardOptions,
): DriverDashboardData {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState<string | null>(null)
  const [orders, setOrders] = useState<DriverOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const loadOrders = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const merchant = await fetchDriverMerchant(user.id)
      if (!merchant) {
        setMerchantId(null)
        setMerchantName(null)
        setOrders([])
        return
      }

      setMerchantId(merchant.id)
      setMerchantName(merchant.name)

      const data = await fetchDriverOrders(merchant.id, user.id)
      setOrders(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar los pedidos',
      )
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (!merchantId) return

    const channel = supabase
      .channel('driver-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE_NAMES.orders,
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          const newOrder = payload.new as OrderRow
          if (newOrder.status === 'ready') {
            setOrders((prev) => {
              if (prev.find((o) => o.id === newOrder.id)) return prev
              return [newOrder as DriverOrder, ...prev]
            })
            options?.onNewReadyOrder?.(newOrder as DriverOrder)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLE_NAMES.orders,
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<DriverOrder>
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id ? { ...o, ...updated } : o,
            ),
          )
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [merchantId, options])

  const takeOrder = useCallback(
    async (orderId: string): Promise<void> => {
      if (!user) return
      setActionLoading(true)
      setActionError(null)
      try {
        await updateOrderStatus(orderId, 'on_the_way', user.id)
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'on_the_way', driver_id: user.id } : o,
          ),
        )
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Error al tomar el pedido',
        )
      } finally {
        setActionLoading(false)
      }
    },
    [],
  )

  const startDelivery = useCallback(
    async (orderId: string): Promise<void> => {
      if (!user) return
      setActionLoading(true)
      setActionError(null)
      try {
        await updateOrderStatus(orderId, 'on_the_way', user.id)
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'on_the_way', driver_id: user.id } : o,
          ),
        )
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'Error al iniciar entrega',
        )
      } finally {
        setActionLoading(false)
      }
    },
    [],
  )

  const markDelivered = useCallback(
    async (orderId: string): Promise<void> => {
      setActionLoading(true)
      setActionError(null)
      try {
        await updateOrderStatus(orderId, 'delivered')
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Error al marcar como entregado',
        )
      } finally {
        setActionLoading(false)
      }
    },
    [],
  )

  const refresh = useCallback(() => {
    void loadOrders()
  }, [loadOrders])

  return {
    merchantId,
    merchantName,
    orders,
    loading,
    error,
    actionLoading,
    actionError,
    takeOrder,
    startDelivery,
    markDelivered,
    refresh,
  }
}

export default useDriverDashboard
