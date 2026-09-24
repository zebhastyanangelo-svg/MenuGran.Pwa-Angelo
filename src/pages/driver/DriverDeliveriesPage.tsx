import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package,
  LogOut,
  Loader2,
  AlertCircle,
  MapPin,
  Phone,
  Navigation,
  ShoppingBasket,
  PackageCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useDriverDeliveries } from '../../hooks/useDriverDeliveries'
import { useNotificationToast } from '../../components/pwa/useNotificationToast'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DeliveryTrackingModal } from '../../components/driver/DeliveryTrackingModal'
import { formatPrice } from '../../types/cart'
import { getOrderStatusLabel } from '../../utils/orderStatus'
import { getOrderTypeLabel } from '../../utils/orderType'
import {
  NEW_DELIVERY_STATUSES,
  getOrderDeliveryAddress,
} from '../../utils/delivery'
import type { DriverOrder } from '../../hooks/useDriverDeliveries'

function getCustomerName(order: DriverOrder): string {
  const profile = order.profiles
  if (profile?.full_name) return profile.full_name
  if (profile?.email) return profile.email
  if (order.customer_id) return `Cliente ${order.customer_id.slice(0, 6)}`
  return 'Cliente General'
}

function getCustomerPhone(order: DriverOrder): string | null {
  return order.profiles?.phone ?? null
}

function getOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`
}

function getBadgeVariant(status: DriverOrder['status']): 'success' | 'info' | 'warning' | 'danger' | 'primary' | 'neutral' {
  switch (status) {
    case 'confirmed':
      return 'warning'
    case 'preparing':
      return 'info'
    case 'ready':
      return 'success'
    case 'on_the_way':
      return 'info'
    case 'delivered':
      return 'primary'
    case 'cancelled':
      return 'danger'
    default:
      return 'neutral'
  }
}

type TabKey = 'assigned' | 'inTransit' | 'delivered'

interface TabConfig {
  key: TabKey
  label: string
  icon: React.ReactNode
  color: string
}

const TABS: TabConfig[] = [
  { key: 'assigned', label: 'Nuevas', icon: <Package className="h-4 w-4" />, color: 'text-green-700 bg-green-100' },
  { key: 'inTransit', label: 'En camino', icon: <Navigation className="h-4 w-4" />, color: 'text-blue-700 bg-blue-100' },
  { key: 'delivered', label: 'Completadas', icon: <PackageCheck className="h-4 w-4" />, color: 'text-gray-700 bg-gray-100' },
]

export function DriverDeliveriesPage() {
  const { user, signOut } = useAuth()
  const {
    merchantName,
    assigned,
    inTransit,
    delivered,
    loading,
    error,
    actionLoading,
    actionError,
    takeOrder,
    refresh,
  } = useDriverDeliveries(user)

  const { showToast } = useNotificationToast()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('assigned')

  // Vista en vivo de todas las órdenes rastreadas (se actualiza por Realtime)
  const allOrders = useMemo(
    () => [...assigned, ...inTransit, ...delivered],
    [assigned, inTransit, delivered],
  )

  // Cuando el cliente confirma la recepción (status -> 'delivered') con el
  // mapa activo abierto: cerrar el modal, mover la orden a "Completadas"
  // y notificar al repartidor.
  useEffect(() => {
    if (!isModalOpen || !selectedOrder || selectedOrder.status === 'delivered') {
      return
    }
    const latest = allOrders.find((o) => o.id === selectedOrder.id)
    if (!latest || latest.status !== 'delivered') {
      return
    }
    setIsModalOpen(false)
    setSelectedOrder(null)
    setActiveTab('delivered')
    showToast({
      title: 'Pedido entregado',
      message: '¡El cliente ha confirmado la recepción del pedido!',
      variant: 'success',
      durationMs: 6000,
    })
  }, [allOrders, isModalOpen, selectedOrder, showToast])

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } finally {
      setIsLoggingOut(false)
    }
  }, [signOut])

  const handleOpenOrder = useCallback((order: DriverOrder) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }, [])

  const handleStartTrip = useCallback(
    async (orderId: string) => {
      await takeOrder(orderId)
    },
    [takeOrder],
  )

  const handleStartRoute = useCallback(
    async (order: DriverOrder) => {
      if (NEW_DELIVERY_STATUSES.includes(order.status)) {
        await takeOrder(order.id)
      }
      setSelectedOrder((prev) =>
        prev && prev.id === order.id ? { ...prev, status: 'on_the_way' } : { ...order, status: 'on_the_way' },
      )
      setIsModalOpen(true)
    },
    [takeOrder],
  )

  const getOrdersForTab = (tab: TabKey): DriverOrder[] => {
    switch (tab) {
      case 'assigned':
        return assigned
      case 'inTransit':
        return inTransit
      case 'delivered':
        return delivered
    }
  }

  const ordersForActiveTab = getOrdersForTab(activeTab)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Entregas</h1>
              {merchantName && (
                <p className="text-xs text-gray-500" data-testid="driver-merchant-name">
                  {merchantName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              data-testid="refresh-btn"
            >
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              data-testid="driver-logout"
            >
              {isLoggingOut ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-1 h-4 w-4" />
              )}
              Salir
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="mt-4 flex gap-1 overflow-x-auto pb-2" role="tablist" aria-label="Estados de entrega">
          {TABS.map((tab) => {
            const orders = getOrdersForTab(tab.key)
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? `${tab.color} shadow-sm`
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <span className="flex items-center justify-center">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`flex items-center justify-center min-w-[1.5rem] h-5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white text-inherit' : 'bg-gray-200 text-gray-600'
                }`}>
                  {orders.length}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Loading */}
        {loading && (
          <p className="text-center text-gray-600" role="status" data-testid="driver-loading">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Cargando pedidos...
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="driver-error">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="driver-action-error">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {actionError}
          </div>
        )}

        {/* Orders List */}
        <section
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="space-y-3"
          data-testid={`orders-panel-${activeTab}`}
        >
          {ordersForActiveTab.length > 0 ? (
            ordersForActiveTab.map((order) => (
              <DeliveryCard
                key={order.id}
                order={order}
                onOpen={handleOpenOrder}
                onStartRoute={handleStartRoute}
                actionLoading={actionLoading}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
              <PackageCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-700 mb-1">
                Sin entregas {activeTab === 'assigned' ? 'asignadas' : activeTab === 'inTransit' ? 'en camino' : 'completadas'}
              </h2>
              <p className="text-sm text-gray-500" data-testid="driver-no-orders">
                {activeTab === 'assigned'
                  ? 'Cuando el comercio te asigne un pedido de delivery, aparecerá aquí automáticamente.'
                  : activeTab === 'inTransit'
                  ? 'No tienes entregas en curso actualmente.'
                  : 'Tu historial de entregas completadas aparecerá aquí.'}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Tracking modal */}
      {selectedOrder && (
        <DeliveryTrackingModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onStartTrip={handleStartTrip}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}

/* ---------- Delivery Card ---------- */

interface DeliveryCardProps {
  order: DriverOrder
  onOpen: (order: DriverOrder) => void
  onStartRoute: (order: DriverOrder) => Promise<void>
  actionLoading: boolean
}

function DeliveryCard({
  order,
  onOpen,
  onStartRoute,
  actionLoading,
}: DeliveryCardProps) {
  const customerName = getCustomerName(order)
  const customerPhone = getCustomerPhone(order)
  const address = getOrderDeliveryAddress(order)
  const isInTransit = order.status === 'on_the_way'
  const isDelivered = order.status === 'delivered'

  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
      onClick={() => onOpen(order)}
      data-testid="delivery-card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(order)
        }
      }}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant(order.status)}>
            {getOrderStatusLabel(order.status)}
          </Badge>
          <span className="text-xs text-gray-400">
            {getOrderTypeLabel(order.type)}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900">{getOrderNumber(order.id)}</span>
      </header>

      <section className="mb-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-medium text-gray-800 truncate">{customerName}</span>
          {customerPhone && (
            <span className="text-gray-500 text-xs truncate">{customerPhone}</span>
          )}
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <span className="text-gray-600 text-xs line-clamp-2">{address}</span>
        </div>
      </section>

      <section className="mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
          <ShoppingBasket className="h-3.5 w-3.5 text-gray-400" />
          {order.items.length} producto{order.items.length !== 1 ? 's' : ''} — Total: {formatPrice(order.total_amount)}
        </div>
      </section>

      {/* Quick Actions Footer */}
      <footer className="flex flex-col gap-3 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Primary route action (native in-app map) */}
        {!isDelivered && (
          <Button
            data-testid={`start-route-${order.id}`}
            variant="primary"
            fullWidth
            isLoading={actionLoading}
            disabled={actionLoading}
            onClick={(e) => {
              e.stopPropagation()
              void onStartRoute(order)
            }}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {isInTransit ? 'Ver ruta en mapa' : 'En camino'}
          </Button>
        )}

        {isDelivered && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <p className="text-sm font-medium text-emerald-700">Entrega completada</p>
          </div>
        )}
      </footer>
    </article>
  )
}

export default DriverDeliveriesPage