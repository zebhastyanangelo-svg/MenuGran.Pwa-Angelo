import { Phone, MapPin, ShoppingBasket, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { OrderStatusBadge } from '../merchant/OrderStatusBadge'
import { formatPrice } from '../../types/cart'
import { getOrderTypeLabel } from '../../utils/orderType'
import type { DriverOrder } from '../../hooks/useDriverDashboard'

export interface DriverOrderCardProps {
  order: DriverOrder
  onTakeOrder: (orderId: string) => Promise<void>
  onMarkDelivered: (orderId: string) => Promise<void>
  actionDisabled: boolean
}

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

function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function getOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`
}

export function DriverOrderCard({
  order,
  onTakeOrder,
  onMarkDelivered,
  actionDisabled,
}: DriverOrderCardProps) {
  const customerName = getCustomerName(order)
  const customerPhone = getCustomerPhone(order)
  const address = getDeliveryAddress(order)
  const mapsUrl = buildMapsUrl(address)

  const isReady = order.status === 'ready'
  const isOnTheWay = order.status === 'on_the_way'

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-600">
            {getOrderTypeLabel(order.type)}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-gray-900">
            {getOrderNumber(order.id)}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      <section className="mb-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-800">{customerName}</span>
          {customerPhone ? (
            <span className="text-gray-600">{customerPhone}</span>
          ) : (
            <span className="text-gray-400">Teléfono no disponible</span>
          )}
        </div>

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <span className="text-gray-700">{address}</span>
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <ShoppingBasket className="h-4 w-4 text-gray-400" />
          <span>Productos</span>
        </div>
        <ul className="space-y-1 text-sm">
          {order.items.map((item) => (
            <li
              key={item.product_id}
              className="flex justify-between"
            >
              <span className="text-gray-600">
                {item.product_id} x{item.quantity}
              </span>
              <span className="font-medium">
                {formatPrice(item.quantity * item.unit_price)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
          <span>Total a cobrar:</span>
          <span className="text-brand-red">{formatPrice(order.total_amount)}</span>
        </div>
      </section>

      <footer className="flex flex-col gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="open-gps"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <MapPin className="h-4 w-4" />
          Abrir GPS / Maps
          <ExternalLink className="h-3 w-3" />
        </a>

        {isReady && (
          <Button
            data-testid="take-order"
            variant="primary"
            fullWidth
            isLoading={actionDisabled}
            disabled={actionDisabled}
            onClick={() => void onTakeOrder(order.id)}
          >
            Tomar pedido y salir
          </Button>
        )}

        {isOnTheWay && (
          <Button
            data-testid="mark-delivered"
            variant="danger"
            fullWidth
            isLoading={actionDisabled}
            disabled={actionDisabled}
            onClick={() => void onMarkDelivered(order.id)}
          >
            Marcar como Entregado
          </Button>
        )}
      </footer>
    </article>
  )
}

export default DriverOrderCard
