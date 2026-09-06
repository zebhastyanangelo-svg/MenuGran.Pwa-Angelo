import { useCallback, useState } from 'react'
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
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useDriverDeliveries } from '../../hooks/useDriverDeliveries'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DeliveryTrackingModal } from '../../components/driver/DeliveryTrackingModal'
import { formatPrice } from '../../types/cart'
import { getOrderStatusLabel } from '../../utils/orderStatus'
import { getOrderTypeLabel } from '../../utils/orderType'
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

function getDeliveryAddress(order: DriverOrder): string {
  return order.delivery_address_notes ?? 'Dirección no disponible'
}

function getOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`
}

function getBadgeVariant(status: DriverOrder['status']): 'success' | 'info' | 'warning' | 'danger' | 'primary' | 'neutral' {
  switch (status) {
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
    markDelivered,
    refresh,
  } = useDriverDeliveries(user)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const handleConfirmDelivery = useCallback(
    async (orderId: string) => {
      await markDelivered(orderId)
    },
    [markDelivered],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
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

        {/* In Transit section */}
        {inTransit.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-3">
              <Navigation className="h-4 w-4" />
              En Camino ({inTransit.length})
            </h2>
            <div className="space-y-3">
              {inTransit.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onOpen={handleOpenOrder}
                  label="Continuar"
                />
              ))}
            </div>
          </section>
        )}

        {/* Assigned section */}
        {assigned.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-3">
              <Package className="h-4 w-4" />
              Nuevas ({assigned.length})
            </h2>
            <div className="space-y-3">
              {assigned.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onOpen={handleOpenOrder}
                  label="Aceptar"
                />
              ))}
            </div>
          </section>
        )}

        {/* Delivered section */}
        {delivered.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-3">
              <PackageCheck className="h-4 w-4" />
              Historial ({delivered.length})
            </h2>
            <div className="space-y-3">
              {delivered.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onOpen={handleOpenOrder}
                  label="Ver detalle"
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && !error && assigned.length === 0 && inTransit.length === 0 && delivered.length === 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
            <PackageCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-gray-700 mb-1">
              Sin entregas asignadas
            </h2>
            <p className="text-sm text-gray-500" data-testid="driver-no-orders">
              Cuando el comercio te asigne un pedido de delivery, aparecerá aquí automáticamente.
            </p>
          </section>
        )}
      </main>

      {/* Tracking modal */}
      {selectedOrder && (
        <DeliveryTrackingModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onStartTrip={handleStartTrip}
          onConfirmDelivery={handleConfirmDelivery}
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
  label: string
}

function DeliveryCard({ order, onOpen, label }: DeliveryCardProps) {
  const customerName = getCustomerName(order)
  const customerPhone = getCustomerPhone(order)
  const address = getDeliveryAddress(order)

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
      <header className="mb-2 flex items-start justify-between gap-2">
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

      <section className="mb-3 space-y-1">
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

      <footer className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-400">
          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
          {label}
          <ChevronRight className="h-4 w-4" />
        </span>
      </footer>
    </article>
  )
}

export default DriverDeliveriesPage
