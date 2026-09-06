import { useEffect, useMemo } from 'react'
import {
  X,
  MapPin,
  Phone,
  ExternalLink,
  Navigation,
  Loader2,
  Package,
} from 'lucide-react'
import { MapView } from '../map/MapView'
import { useGpsTracking } from '../../hooks/useGpsTracking'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatPrice } from '../../types/cart'
import { getOrderStatusLabel } from '../../utils/orderStatus'
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

function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function getDeliveryDestination(order: DriverOrder): [number, number] | null {
  if (order.delivery_location) {
    return [order.delivery_location.y, order.delivery_location.x]
  }
  return null
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

interface DeliveryTrackingModalProps {
  order: DriverOrder
  isOpen: boolean
  onClose: () => void
  onStartTrip: (orderId: string) => Promise<void>
  onConfirmDelivery: (orderId: string) => Promise<void>
  actionLoading: boolean
}

export function DeliveryTrackingModal({
  order,
  isOpen,
  onClose,
  onStartTrip,
  onConfirmDelivery,
  actionLoading,
}: DeliveryTrackingModalProps) {
  const customerName = getCustomerName(order)
  const customerPhone = getCustomerPhone(order)
  const address = getDeliveryAddress(order)
  const mapsUrl = buildMapsUrl(address)
  const destination = getDeliveryDestination(order)
  const isActive = order.status === 'on_the_way'
  const isAssigned = order.status === 'ready'

  const { position, error: gpsError, tracking, startTracking, stopTracking } =
    useGpsTracking(isActive ? order.id : null)

  useEffect(() => {
    if (isOpen && isActive && !tracking && !gpsError) {
      startTracking()
    }
  }, [isOpen, isActive, tracking, gpsError, startTracking])

  useEffect(() => {
    if (!isOpen) {
      stopTracking()
    }
  }, [isOpen, stopTracking])

  const markers = useMemo(() => {
    const result: Array<{ id: string; position: [number, number]; title: string; subtitle?: string }> = []

    if (destination) {
      result.push({
        id: 'destination',
        position: destination,
        title: 'Destino',
        subtitle: address,
      })
    }

    if (position) {
      result.push({
        id: 'driver',
        position: [position.lat, position.lng],
        title: 'Mi posición',
      })
    }

    return result
  }, [destination, position, address])

  const mapCenter: [number, number] = useMemo(() => {
    if (position && destination) {
      return [
        (position.lat + destination[0]) / 2,
        (position.lng + destination[1]) / 2,
      ]
    }
    if (destination) return destination
    if (position) return [position.lat, position.lng]
    return [19.4326, -99.1332]
  }, [position, destination])

  const mapZoom = useMemo(() => {
    if (position && destination) return 13
    if (destination || position) return 15
    return 13
  }, [position, destination])

  const handleStartTrip = async () => {
    await onStartTrip(order.id)
  }

  const handleConfirmDelivery = async () => {
    await onConfirmDelivery(order.id)
    onClose()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-white ${isOpen ? 'flex' : 'hidden'}`}
      data-testid="delivery-tracking-modal"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          {isActive && <Navigation className="h-5 w-5 text-blue-600 animate-pulse" />}
          {!isActive && <Package className="h-5 w-5 text-gray-600" />}
          <div>
            <p className="text-sm font-bold text-gray-900">{getOrderNumber(order.id)}</p>
            <Badge variant={getBadgeVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          data-testid="modal-close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* GPS status */}
      {tracking && position && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-xs text-green-700 flex items-center gap-2" data-testid="gps-active">
          <MapPin className="h-3.5 w-3.5" />
          GPS activo — Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
        </div>
      )}

      {gpsError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2" data-testid="gps-error">
          <MapPin className="h-3.5 w-3.5" />
          {gpsError}
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative bg-gray-200">
        {markers.length > 0 ? (
          <MapView
            markers={markers}
            center={mapCenter}
            zoom={mapZoom}
            userLocation={position ? [position.lat, position.lng] : null}
            className="h-full w-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {isActive ? 'Esperando posición GPS...' : 'Cargando mapa...'}
          </div>
        )}
      </div>

      {/* Bottom action panel */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 space-y-3 shadow-lg">
        {/* Customer info */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{customerName}</p>
            <p className="text-xs text-gray-500 truncate">{address}</p>
          </div>
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors shrink-0"
              data-testid="call-customer"
            >
              <Phone className="h-3.5 w-3.5" />
              Llamar
            </a>
          )}
        </div>

        {/* Products summary */}
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
            <Package className="h-3.5 w-3.5" />
            {order.items.length} producto{order.items.length !== 1 ? 's' : ''} — Total: {formatPrice(order.total_amount)}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1"
            data-testid="open-maps"
          >
            <ExternalLink className="h-4 w-4" />
            Google Maps
          </a>
        </div>

        {/* Primary action */}
        {isAssigned && (
          <Button
            data-testid="start-trip"
            variant="primary"
            fullWidth
            isLoading={actionLoading}
            disabled={actionLoading}
            onClick={() => void handleStartTrip()}
          >
            Iniciar viaje
          </Button>
        )}

        {isActive && (
          <Button
            data-testid="confirm-delivery"
            variant="primary"
            fullWidth
            isLoading={actionLoading}
            disabled={actionLoading}
            onClick={() => void handleConfirmDelivery()}
          >
            Confirmar entrega
          </Button>
        )}

        {order.status === 'delivered' && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <p className="text-sm font-medium text-emerald-700">Entrega completada</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryTrackingModal
