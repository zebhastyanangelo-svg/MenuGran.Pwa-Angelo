import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import {
  X,
  MapPin,
  Package,
  Loader2,
  Navigation,
} from 'lucide-react'
import { MapView } from '../map/MapView'
import type { MapMarker } from '../map/MapView'
import { useGpsTracking } from '../../hooks/useGpsTracking'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatPrice } from '../../types/cart'
import { getOrderStatusLabel } from '../../utils/orderStatus'
import { fetchOsrmRouteDetails, type OsrmRouteDetails } from '../../utils/osrmRoute'
import { buildNavigationInstruction, buildEtaLine, shouldRefetchRoute } from '../../utils/navigationInstruction'
import { speakNavigationInstruction, stopNavigationSpeech } from '../../utils/voiceGuidance'
import {
  NavigationInstructionBar,
  NavigationSideControls,
  NavigationPersonCard,
} from '../map/NavigationTrackingOverlay'
import {
  NEW_DELIVERY_STATUSES,
  getOrderDeliveryAddress,
  getOrderDeliveryCoordinates,
  buildDeliveryMapsUrl,
  buildWhatsAppUrl,
} from '../../utils/delivery'
import type { DriverOrder } from '../../hooks/useDriverDeliveries'

/** Zoom de navegación: el nivel con el que un GPS muestra la calle actual. */
const NAVIGATION_ZOOM = 16

// Custom icons for map markers
const DESTINATION_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13401 15.866 2 12 2Z" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="9" r="3" fill="#ef4444"/>
    </svg>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
})

const DRIVER_ICON = L.divIcon({
  className: 'custom-marker',
  html: `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" fill="#10b981"/>
      <path d="M12 8V12L15 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
})

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

interface DeliveryTrackingModalProps {
  order: DriverOrder
  isOpen: boolean
  onClose: () => void
  onStartTrip: (orderId: string) => Promise<void>
  actionLoading: boolean
}

export function DeliveryTrackingModal({
  order,
  isOpen,
  onClose,
  onStartTrip,
  actionLoading,
}: DeliveryTrackingModalProps) {
  const customerName = getCustomerName(order)
  const customerPhone = getCustomerPhone(order)
  const address = getOrderDeliveryAddress(order)
  const destination = getOrderDeliveryCoordinates(order)
  const isActive = order.status === 'on_the_way'
  const isAssigned = NEW_DELIVERY_STATUSES.includes(order.status)

  const { position, error: gpsError, tracking, startTracking, stopTracking } =
    useGpsTracking(isActive ? order.id : null)

  /** Mapa Leaflet crudo, para los botones imperativos del HUD. */
  const mapRef = useRef<L.Map | null>(null)
  /** Audio de navegación: silenciado por defecto, como los GPS reales. */
  const [muted, setMuted] = useState(true)
  const [routeDetails, setRouteDetails] = useState<OsrmRouteDetails | null>(null)
  const lastFetchOriginRef = useRef<[number, number] | null>(null)
  const lastSpokenInstructionRef = useRef('')

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

  // La síntesis de voz muere con el modal: no puede quedar hablando sola.
  useEffect(() => () => stopNavigationSpeech(), [])

  useEffect(() => {
    if (!position || !destination) {
      setRouteDetails(null)
      lastFetchOriginRef.current = null
      return
    }

    const origin: [number, number] = [position.lat, position.lng]
    // OSRM se re-consulta solo cuando el repartidor avanzó de verdad: un
    // tick por segundo no cambia la maniobra y martillea el servicio.
    if (!shouldRefetchRoute(lastFetchOriginRef.current, origin)) return
    lastFetchOriginRef.current = origin

    let cancelled = false
    void fetchOsrmRouteDetails(origin, destination).then((details) => {
      if (!cancelled) setRouteDetails(details)
    })
    return () => {
      cancelled = true
    }
  }, [position, destination])

  const instruction = useMemo(() => {
    if (routeDetails === null || routeDetails.steps.length === 0) return null
    return buildNavigationInstruction(routeDetails.steps[0])
  }, [routeDetails])

  // Guía de voz: cada instrucción nueva se anuncia una sola vez.
  useEffect(() => {
    if (muted || instruction === null) return
    if (lastSpokenInstructionRef.current === instruction.text) return
    lastSpokenInstructionRef.current = instruction.text
    speakNavigationInstruction(instruction.text)
  }, [muted, instruction])

  useEffect(() => {
    if (muted) stopNavigationSpeech()
  }, [muted])

  const markers = useMemo(() => {
    const result: MapMarker[] = []

    if (destination) {
      result.push({
        id: 'destination',
        position: destination,
        title: 'Destino',
        subtitle: address,
        icon: DESTINATION_ICON,
      })
    }

    if (position) {
      result.push({
        id: 'driver',
        position: [position.lat, position.lng],
        title: 'Mi posición',
        icon: DRIVER_ICON,
      })
    }

    return result
  }, [destination, position, address])

  const mapCenter = useMemo(() => {
    if (position && destination) {
      return [
        (position.lat + destination[0]) / 2,
        (position.lng + destination[1]) / 2,
      ] as [number, number]
    }
    if (destination) return destination as [number, number]
    if (position) return [position.lat, position.lng] as [number, number]
    return undefined
  }, [position, destination])

  const handleReorient = () => {
    if (position === null || mapRef.current === null) return
    mapRef.current.setView([position.lat, position.lng], NAVIGATION_ZOOM)
  }

  const handleCenter = () => {
    if (position === null || mapRef.current === null) return
    mapRef.current.panTo([position.lat, position.lng])
  }

  const handleToggleMute = () => {
    setMuted((previous) => !previous)
  }

  const handleChat = () => {
    if (customerPhone === null) return
    const url = buildWhatsAppUrl(customerPhone)
    if (url !== null) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleStartTrip = async () => {
    await onStartTrip(order.id)
  }

  const etaLine = routeDetails !== null
    ? buildEtaLine(routeDetails.durationSeconds, routeDetails.distanceMeters)
    : buildEtaLine(0, 0)

  const productsSummary = `${order.items.length} producto${order.items.length !== 1 ? 's' : ''} · Total: ${formatPrice(order.total_amount)}`

  const primaryAction = isAssigned ? (
    <Button
      data-testid="start-trip"
      variant="primary"
      fullWidth
      isLoading={actionLoading}
      disabled={actionLoading}
      onClick={() => void handleStartTrip()}
    >
      <Navigation className="h-5 w-5" aria-hidden="true" />
      En camino
    </Button>
  ) : isActive ? (
    <p className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-center text-xs font-medium text-blue-700">
      Cuando entregues el pedido, el cliente confirmará la recepción desde su aplicación.
    </p>
  ) : order.status === 'delivered' ? (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
      <p className="text-sm font-medium text-emerald-700">Entrega completada</p>
    </div>
  ) : undefined

  const googleMapsUrl = buildDeliveryMapsUrl(order as any)

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-gray-900 ${isOpen ? 'flex' : 'hidden'}`}
      data-testid="delivery-tracking-modal"
    >
      <div className="relative flex-1 overflow-hidden">
        {markers.length > 0 ? (
          <MapView
            markers={markers}
            center={mapCenter}
            zoom={isActive ? NAVIGATION_ZOOM : 13}
            userLocation={position ? [position.lat, position.lng] : null}
            followUserLocation={isActive}
            route={routeDetails?.coordinates}
            onMapReady={(map) => {
              mapRef.current = map
            }}
            className="absolute inset-0"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-500 text-sm p-4">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-gray-300" />
            <p className="text-center mb-2">
              {isActive ? 'Esperando posición GPS...' : 'Cargando mapa...'}
            </p>
            {destination && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline"
              >
                Abrir en Google Maps
              </a>
            )}
            {!destination && address && address !== 'Dirección no disponible' && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline"
              >
                Ver dirección en Google Maps
              </a>
            )}
          </div>
        )}

        {/* Encabezado flotante: chip del pedido a la izquierda, cierre a la derecha. */}
        <div className="absolute inset-x-3 top-3 z-30 flex items-start justify-between">
          <div
            className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur-md"
            data-testid="delivery-order-chip"
          >
            <Package className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-900">{getOrderNumber(order.id)}</p>
            <Badge variant={getBadgeVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-white/95 p-2.5 text-gray-500 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-colors hover:bg-gray-100 hover:text-gray-700"
            data-testid="modal-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Estado del GPS: píldora flotante sobre la tarjeta inferior. */}
        {tracking && position && (
          <div
            className="absolute left-3 bottom-[264px] z-10 flex items-center gap-2 rounded-full bg-emerald-600/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
            data-testid="gps-active"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            GPS activo — Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
          </div>
        )}

        {gpsError && (
          <div
            className="absolute left-3 bottom-[264px] z-10 flex items-center gap-2 rounded-full bg-amber-500/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
            data-testid="gps-error"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {gpsError}
          </div>
        )}

        {/* HUD de navegación flotante sobre el mapa: la tarjeta inferior y los
            controles laterales son visibles desde el arranque, aunque el GPS
            todavía no entregue posición; solo la barra de instrucciones espera
            a la primera maniobra calculada. */}
        {instruction !== null && (
          <div className="absolute inset-x-0 top-16">
            <NavigationInstructionBar
              icon={instruction.icon}
              text={instruction.text}
              distanceLabel={instruction.distanceLabel}
            />
          </div>
        )}
        <NavigationSideControls
          muted={muted}
          onToggleMute={handleToggleMute}
          onReorient={handleReorient}
          onCenter={handleCenter}
          positionClass={instruction !== null ? 'right-3 top-44' : 'right-3 top-20'}
          centerButtonClass="bottom-[264px] right-3"
        />
        <NavigationPersonCard
          etaLine={etaLine}
          sectionLabel={isActive ? 'ENTREGANDO A:' : 'CLIENTE:'}
          name={customerName}
          verified={customerPhone !== null}
          avatarUrl={null}
          detailLabel={`${address} · ${productsSummary}`}
          phone={customerPhone}
          onChat={customerPhone !== null ? handleChat : undefined}
          primaryAction={primaryAction}
        />
      </div>
    </div>
  )
}

export default DeliveryTrackingModal
