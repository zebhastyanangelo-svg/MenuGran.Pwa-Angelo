import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../../hooks/useAuth';
import { useDriverDashboard } from '../../hooks/useDriverDashboard';
import { useGpsTracking } from '../../hooks/useGpsTracking';
import { useNotificationToast } from '../../components/pwa/useNotificationToast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CompletedPeriodFilter } from '../../components/driver/CompletedPeriodFilter';
import { formatPrice } from '../../types/cart';
import { getOrderTypeLabel } from '../../utils/orderType';
import { buildTelUrl, getOrderDeliveryCoordinates } from '../../utils/delivery';
import { filterDeliveredOrdersByPeriod, type CompletedPeriod } from '../../utils/completedDeliveries';
import { MapView } from '../../components/map/MapView';
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
  const { showToast } = useNotificationToast();
  const prevStatusRef = useRef<Map<string, DriverOrder['status']>>(new Map());
  const selfMarkedRef = useRef<Set<string>>(new Set());

  // Cuando el cliente confirma la recepción vía Realtime, la orden sale de
  // "on_the_way": el mapa activo se cierra (activeDeliveryOrder → null), la
  // orden pasa a "Completadas" y se notifica al repartidor.
  useEffect(() => {
    for (const order of orders) {
      const prevStatus = prevStatusRef.current.get(order.id);
      prevStatusRef.current.set(order.id, order.status);
      const markedByDriver = selfMarkedRef.current.delete(order.id);
      if (prevStatus === 'on_the_way' && order.status === 'delivered' && !markedByDriver) {
        showToast({
          title: 'Pedido entregado',
          message: '¡El cliente ha confirmado la recepción del pedido!',
          variant: 'success',
          durationMs: 6000,
        });
      }
    }
  }, [orders, showToast]);

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
      selfMarkedRef.current.add(orderId);
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
              <i className="fa-solid fa-box text-2xl text-blue-600" />
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
                <i className="fa-solid fa-spinner mr-1 text-base animate-spin" />
              ) : (
                <i className="fa-solid fa-right-from-bracket mr-1 text-base" />
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

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4" data-testid="driver-pending-banner">
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-location-arrow text-xl text-blue-600" />
              <h2 className="text-sm font-bold text-blue-800">Tienes una entrega pendiente</h2>
            </div>
            <p className="text-xs text-blue-600 mb-3">
              Este pedido te fue asignado. Revisa los detalles y presiona "Iniciar Entrega" cuando estés listo.
            </p>
          </div>

          <AssignedOrderCard
            order={assignedReadyOrder}
            onStartDelivery={() => void handleStartDelivery(assignedReadyOrder.id)}
            onViewRoute={() => {
              const address = getDeliveryAddress(assignedReadyOrder);
              window.open(buildMapsUrl(address), '_blank');
            }}
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
              <i className="fa-solid fa-spinner text-base animate-spin inline mr-2" />
              Cargando pedidos...
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="driver-error">
              <i className="fa-solid fa-circle-exclamation text-base inline mr-2" />
              {error}
            </div>
          )}

          {actionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="driver-action-error">
              <i className="fa-solid fa-circle-exclamation text-base inline mr-2" />
              {actionError}
            </div>
          )}

          {gpsError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700" role="alert" data-testid="driver-gps-error">
              <i className="fa-solid fa-location-dot text-base inline mr-2" />
              {gpsError}
            </div>
          )}

          {!loading && !error && (
            <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
              <i className="fa-solid fa-circle-check text-[48px] text-gray-300 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-700 mb-1">
                Sin entregas asignadas
              </h2>
              <p className="text-sm text-gray-500" data-testid="driver-no-orders">
                Cuando el comercio te asigne un pedido de delivery, aparecerá aquí automáticamente.
              </p>
            </section>
          )}
        </main>
      )}
      <CompletedDeliveriesList orders={orders} user={user} />
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
  onLogout,
  isLoggingOut,
}: ActiveDeliveryViewProps) {
  const customerName = getCustomerName(order);
  // Enlace `tel:` con prefijo internacional: sin teléfono válido no se pinta.
  const customerTelUrl = buildTelUrl(getCustomerPhone(order));
  const address = getDeliveryAddress(order);
  const mapsUrl = buildMapsUrl(address);
  const deliveryCoords = getOrderDeliveryCoordinates(order);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-location-arrow text-xl text-blue-600 animate-pulse" />
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
            <i className="fa-solid fa-spinner text-base animate-spin" />
          ) : (
            <i className="fa-solid fa-right-from-bracket text-base" />
          )}
        </Button>
      </div>

      {/* GPS status */}
      {tracking && position && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-xs text-green-700 flex items-center gap-2" data-testid="driver-gps-active">
          <i className="fa-solid fa-location-dot text-sm" />
          GPS activo — Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
        </div>
      )}

      {gpsError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2" data-testid="driver-gps-error">
          <i className="fa-solid fa-location-dot text-sm" />
          {gpsError}
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative bg-gray-200">
        {position ? (
          <MapView
            center={[position.lat, position.lng]}
            zoom={15}
            userLocation={[position.lat, position.lng]}
            markers={
              deliveryCoords
                ? [{
                    id: 'delivery-dest',
                    position: deliveryCoords,
                    title: 'Destino de entrega',
                    subtitle: address,
                  }]
                : []
            }
            routeRequest={
              deliveryCoords
                ? {
                    from: [position.lat, position.lng],
                    to: deliveryCoords,
                  }
                : undefined
            }
            className="h-full w-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <i className="fa-solid fa-spinner text-xl animate-spin mr-2" />
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
          {customerTelUrl !== null && (
            <a
              href={customerTelUrl}
              aria-label={`Llamar a ${customerName}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              data-testid="call-customer"
            >
              <i className="fa-solid fa-phone text-base" />
              Llamar al cliente
            </a>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            data-testid="open-maps"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-base" />
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
  onViewRoute: () => void;
  actionDisabled: boolean;
}

function AssignedOrderCard({ order, onStartDelivery, onViewRoute, actionDisabled }: AssignedOrderCardProps) {
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
          <i className="fa-solid fa-phone text-base text-gray-400" />
          <span className="font-medium text-gray-800">{customerName}</span>
          {customerPhone ? (
            <span className="text-gray-600">{customerPhone}</span>
          ) : (
            <span className="text-gray-400">Teléfono no disponible</span>
          )}
        </div>
        <div className="flex items-start gap-2 text-sm">
          <i className="fa-solid fa-location-dot text-base text-gray-400 mt-0.5 shrink-0" />
          <span className="text-gray-700">{address}</span>
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <i className="fa-solid fa-basket-shopping text-base text-gray-400" />
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onViewRoute}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1"
          data-testid="view-route"
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-base" />
          Ver Ruta GPS
        </button>
      </div>

      <Button
        data-testid="start-delivery"
        variant="primary"
        fullWidth
        isLoading={actionDisabled}
        disabled={actionDisabled}
        onClick={onStartDelivery}
      >
        Iniciar Entrega
      </Button>
    </article>
  );
}

function CompletedDeliveryCard({ order }: { order: DriverOrder }) {
  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="completed-delivery-card"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-600">{getOrderTypeLabel(order.type)}</p>
          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span className="text-lg font-bold text-gray-900">{getOrderNumber(order.id)}</span>
      </header>
      <Badge variant="success" className="flex items-center gap-1">
        <i className="fa-solid fa-circle-check text-xs" />
        Entrega completada
      </Badge>
    </article>
  );
}

function CompletedDeliveriesList({ orders, user }: { orders: DriverOrder[]; user: User | null }) {
  const [period, setPeriod] = useState<CompletedPeriod>('today');
  const [offset, setOffset] = useState(0);
  const delivered = orders.filter(
    (o) => o.status === 'delivered' && o.driver_id === user?.id,
  );
  if (delivered.length === 0) return null;

  const visibleDelivered = filterDeliveredOrdersByPeriod(delivered, period, offset, new Date());

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 space-y-4" data-testid="completed-deliveries">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <i className="fa-solid fa-circle-check text-xl text-emerald-600" />
        Completadas ({visibleDelivered.length})
      </h2>
      <CompletedPeriodFilter
        period={period}
        offset={offset}
        onPeriodChange={(nextPeriod) => {
          setPeriod(nextPeriod);
          setOffset(0);
        }}
        onOffsetChange={setOffset}
      />
      {visibleDelivered.length > 0 ? (
        <div className="space-y-3">
          {visibleDelivered.map((order) => (
            <CompletedDeliveryCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500" data-testid="completed-deliveries-empty">
          No tienes entregas completadas en el período seleccionado.
        </p>
      )}
    </section>
  );
}

export default DriverDashboard;
