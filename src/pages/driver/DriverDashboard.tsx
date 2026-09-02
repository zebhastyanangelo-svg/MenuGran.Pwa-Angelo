import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, LogOut, Loader2, AlertCircle, MapPin, Phone, Navigation, ShoppingBasket, ExternalLink, PackageCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { useGpsTracking } from '../../hooks/useGpsTracking';
import { Button } from '../../components/ui/Button';
import { formatPrice } from '../../types/cart';
import { getOrderTypeLabel } from '../../utils/orderType';
import type { DriverOrder } from '../../hooks/useDriverDashboard';

function getCustomerName(order: DriverOrder): string {
  const profile = order.profiles;
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
  if (order.customer_id) return `Cliente ${order.customer_id.slice(0, 6)}`;
  return 'Cliente General';
}

function getCustomerPhone(order: DriverOrder): string | null {
  return order.profiles?.phone ?? null;
}

function getDeliveryAddress(order: DriverOrder): string {
  return order.delivery_address_notes ?? 'Dirección no disponible';
}

function getOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function DriverDashboard() {
  const { user, signOut } = useAuth();
  const {
    merchantName,
    orders,
    loading,
    error,
    actionLoading,
    actionError,
    startDelivery,
    markDelivered,
  } = useDriverDashboard(user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Separate orders by state
  const assignedReadyOrder = useMemo(
    () => orders.find((o) => o.status === 'ready' && o.driver_id === user?.id) ?? null,
    [orders, user],
  );
  const activeDeliveryOrder = useMemo(
    () => orders.find((o) => o.status === 'on_the_way' && o.driver_id === user?.id) ?? null,
    [orders, user],
  );


  // GPS tracking for active delivery
  const { position, error: gpsError, tracking, startTracking, stopTracking } =
    useGpsTracking(activeDeliveryOrder?.id ?? null);

  // Auto-start GPS when there's an active on_the_way order
  useEffect(() => {
    if (activeDeliveryOrder && !tracking && !gpsError) {
      startTracking();
    }
  }, [activeDeliveryOrder, tracking, gpsError, startTracking]);

  const handleStartDelivery = useCallback(
    async (orderId: string) => {
      await startDelivery(orderId);
      // GPS will auto-start via useEffect once order becomes on_the_way
    },
    [startDelivery],
  );

  const handleMarkDelivered = useCallback(
    async (orderId: string) => {
      stopTracking();
      await markDelivered(orderId);
    },
    [markDelivered, stopTracking],
  );

  const handleLogout = useCallback(async () => {
    stopTracking();
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut, stopTracking]);

  const handleCallCustomer = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  // Determine which state to render
  const isActiveDelivery = !!activeDeliveryOrder;
  const hasAssignedReady = !!assignedReadyOrder;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - hidden during active fullscreen map */}
      {!isActiveDelivery && (
        <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Entregas</h1>
            </div>
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
        </header>
      )}

      {/* ACTIVE DELIVERY — Full-screen map view */}
      {isActiveDelivery && activeDeliveryOrder && (
        <ActiveDeliveryView
          order={activeDeliveryOrder}
          position={position}
          tracking={tracking}
          gpsError={gpsError}
          actionLoading={actionLoading}
          onMarkDelivered={() => void handleMarkDelivered(activeDeliveryOrder.id)}
          onCallCustomer={handleCallCustomer}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}

      {/* ASSIGNED READY ORDER — Prominent card with "Empezar Entrega" */}
      {!isActiveDelivery && hasAssignedReady && assignedReadyOrder && (
        <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {merchantName && (
            <p className="text-sm text-gray-600" data-testid="driver-merchant-name">
              Comercio: {merchantName}
            </p>
          )}

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-blue-800">Pedido asignado — Listo para salir</h2>
            </div>
            <p className="text-xs text-blue-600 mb-3">
              Este pedido te fue asignado. Revisa los detalles y presiona "Empezar Entrega" cuando estés listo.
            </p>
          </div>

          <AssignedOrderCard
            order={assignedReadyOrder}
            onStartDelivery={() => void handleStartDelivery(assignedReadyOrder.id)}
            actionDisabled={actionLoading}
          />
        </main>
      )}

      {/* EMPTY — No assigned order */}
      {!isActiveDelivery && !hasAssignedReady && (
        <main className="mx-auto max-w-3xl px-4 py-8">
          {merchantName && (
            <p className="mb-4 text-sm text-gray-600" data-testid="driver-merchant-name">
              Comercio: {merchantName}
            </p>
          )}

          {loading && (
            <p className="text-gray-600" role="status" data-testid="driver-loading">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Cargando pedidos...
            </p>
          )}

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

          {gpsError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700" role="alert" data-testid="driver-gps-error">
              <MapPin className="h-4 w-4 inline mr-2" />
              {gpsError}
            </div>
          )}

          {!loading && !error && (
            <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
              <PackageCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-700 mb-1">
                Sin entregas pendientes
              </h2>
              <p className="text-sm text-gray-500" data-testid="driver-no-orders">
                Cuando el comercio te asigne un pedido, aparecerá aquí automáticamente.
              </p>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

interface ActiveDeliveryViewProps {
  order: DriverOrder;
  position: { lat: number; lng: number } | null;
  tracking: boolean;
  gpsError: string | null;
  actionLoading: boolean;
  onMarkDelivered: () => void;
  onCallCustomer: (phone: string) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function ActiveDeliveryView({
  order,
  position,
  tracking,
  gpsError,
  actionLoading,
  onMarkDelivered,
  onCallCustomer,
  onLogout,
  isLoggingOut,
}: ActiveDeliveryViewProps) {
  const customerName = getCustomerName(order);
  const customerPhone = getCustomerPhone(order);
  const address = getDeliveryAddress(order);
  const mapsUrl = buildMapsUrl(address);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-gray-900">{getOrderNumber(order.id)}</p>
            <p className="text-xs text-gray-500">En camino</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onLogout()}
          disabled={isLoggingOut}
          data-testid="driver-logout"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* GPS status */}
      {tracking && position && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-xs text-green-700 flex items-center gap-2" data-testid="driver-gps-active">
          <MapPin className="h-3.5 w-3.5" />
          GPS activo — Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
        </div>
      )}

      {gpsError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2" data-testid="driver-gps-error">
          <MapPin className="h-3.5 w-3.5" />
          {gpsError}
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative bg-gray-200">
        {position ? (
          <iframe
            title="Mapa de entrega"
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lng - 0.01},${position.lat - 0.01},${position.lng + 0.01},${position.lat + 0.01}&layer=mapnik&marker=${position.lat},${position.lng}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Esperando posición GPS...
          </div>
        )}
      </div>

      {/* Bottom action panel */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 space-y-3 shadow-lg">
        {/* Customer info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{customerName}</p>
            <p className="text-xs text-gray-500">{address}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {customerPhone && (
            <button
              type="button"
              onClick={() => onCallCustomer(customerPhone)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              data-testid="call-customer"
            >
              <Phone className="h-4 w-4" />
              Llamar al cliente
            </button>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            data-testid="open-maps"
          >
            <ExternalLink className="h-4 w-4" />
            Maps
          </a>
        </div>

        <Button
          data-testid="mark-delivered"
          variant="danger"
          fullWidth
          isLoading={actionLoading}
          disabled={actionLoading}
          onClick={onMarkDelivered}
        >
          Marcar como Entregado
        </Button>
      </div>
    </div>
  );
}

interface AssignedOrderCardProps {
  order: DriverOrder;
  onStartDelivery: () => void;
  actionDisabled: boolean;
}

function AssignedOrderCard({ order, onStartDelivery, actionDisabled }: AssignedOrderCardProps) {
  const customerName = getCustomerName(order);
  const customerPhone = getCustomerPhone(order);
  const address = getDeliveryAddress(order);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-600">{getOrderTypeLabel(order.type)}</p>
          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span className="text-lg font-bold text-gray-900">{getOrderNumber(order.id)}</span>
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
            <li key={item.product_id} className="flex justify-between">
              <span className="text-gray-600">{item.product_id} x{item.quantity}</span>
              <span className="font-medium">{formatPrice(item.quantity * item.unit_price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
          <span>Total a cobrar:</span>
          <span className="text-brand-red">{formatPrice(order.total_amount)}</span>
        </div>
      </section>

      <Button
        data-testid="start-delivery"
        variant="primary"
        fullWidth
        isLoading={actionDisabled}
        disabled={actionDisabled}
        onClick={onStartDelivery}
      >
        Empezar Entrega
      </Button>
    </article>
  );
}

export default DriverDashboard;
