import { useCallback, useEffect, useRef, useState } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLE_NAMES } from '../services/supabase'
import type { OrderRow, OrderStatus } from '../types/database'
import type { DriverOrder } from './useDriverDashboard'

export type { DriverOrder }

export interface UseDriverDeliveriesResult {
  merchantName: string | null
  assigned: DriverOrder[]
  inTransit: DriverOrder[]
  delivered: DriverOrder[]
  loading: boolean
  error: string | null
  actionLoading: boolean
  actionError: string | null
  takeOrder: (orderId: string) => Promise<void>
  startDelivery: (orderId: string) => Promise<void>
  markDelivered: (orderId: string) => Promise<void>
  refresh: () => void
}

export interface UseDriverDeliveriesOptions {
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

async function fetchDriverDeliveries(
  merchantId: string,
  userId: string,
): Promise<DriverOrder[]> {
  const result = await supabase
    .from(TABLE_NAMES.orders)
    .select('*, profiles!customer_id(full_name, email, phone)')
    .eq('merchant_id', merchantId)
    .eq('type', 'delivery')
    .or(
      `and(status.in.(ready,on_the_way,delivered),or(driver_id.is.null,driver_id.eq.${userId}))`,
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

export function useDriverDeliveries(
  user: User | null,
  options?: UseDriverDeliveriesOptions,
): UseDriverDeliveriesResult {
  const [merchantName, setMerchantName] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
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

      const data = await fetchDriverDeliveries(merchant.id, user.id)
      setOrders(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar las entregas',
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
      .channel('driver-deliveries-realtime')
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
          if (newOrder.status === 'ready' && newOrder.type === 'delivery') {
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAMES.deliveries,
        },
        () => {
          void loadOrders()
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [merchantId, options, loadOrders])

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
    [user],
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
    [user],
  )

  const markDelivered = useCallback(
    async (orderId: string): Promise<void> => {
      setActionLoading(true)
      setActionError(null)
      try {
        await updateOrderStatus(orderId, 'delivered')
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'delivered' } : o,
          ),
        )
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

  const assigned = orders.filter(
    (o) => o.status === 'ready' && (o.driver_id === null || o.driver_id === user?.id),
  )
  const inTransit = orders.filter(
    (o) => o.status === 'on_the_way' && o.driver_id === user?.id,
  )
  const delivered = orders.filter(
    (o) => o.status === 'delivered' && o.driver_id === user?.id,
  )

  return {
    merchantName,
    assigned,
    inTransit,
    delivered,
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

export default useDriverDeliveries
