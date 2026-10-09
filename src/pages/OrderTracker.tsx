import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import type { OrderRow, OrderStatus } from '../types/database';
import type { GeoPoint } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  saveOrder,
  getOrder,
  removeOrder,
} from '../utils/offlineStorage';
import {
  useNotifications,
  buildOrderNotification,
} from '../hooks/useNotifications';
import { useOrderReminderScheduler } from '../hooks/useOrderReminderScheduler';
import { sendOrderReminderPushNotification } from '../services/pushNotificationService';
import type { ScheduledReminder } from '../hooks/useOrderReminderScheduler';
import { useNotificationToast } from '../components/pwa/useNotificationToast';
import { statusDisplayMap } from '../utils/statusDisplayMap';
import { getOrderStatusLabel, getOrderStatusFlow } from '../utils/orderStatus';
import { parseGeoPoint } from '../utils/geoPoint';
import { confirmOrderDelivery } from '../services/orderDeliveryService';
import { OrderStatusStep } from '../components/orders/OrderStatusStep';
import { getAllowedTransitions, getTransitionLabel, getTransitionButtonClass } from '../utils/orderStatus';
import { PartyPopper, ArrowLeft, PackageCheck, AlertCircle, Navigation } from 'lucide-react';
import { OrderTrackingPanel } from '../components/orders/OrderTrackingPanel';
import { MapErrorBoundary } from '../components/map/MapErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import posthog, { isPostHogEnabled } from '../posthog';
import { formatUSD, formatVES } from '../utils/format';
import { getPaymentMethodLabel } from '../utils/paymentMethod';
import { useBCVRate } from '../hooks/useExchangeRate';
import type { OrderType } from '../types/database';

interface ProductNameMap {
  [productId: string]: string;
}

/**
 * Línea de envío del resumen. Solo aparece si el pedido fue a domicilio y se
 * cobró algo: el precio queda congelado en la orden, así que el cliente ve
 * exactamente lo que pagó aunque el comercio ya haya cambiado su tarifa.
 */
function DeliveryFeeRow({
  orderType,
  fee,
}: {
  orderType: OrderType;
  fee: string;
}) {
  const amount = Number(fee);
  if (orderType !== 'delivery' || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return (
    <div className="flex justify-between">
      <span className="text-gray-600">Envío:</span>
      <span className="font-medium">{formatUSD(amount)}</span>
    </div>
  );
}

function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return (
    point !== null &&
    point !== undefined &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    !isNaN(point.x) &&
    !isNaN(point.y) &&
    isFinite(point.x) &&
    isFinite(point.y)
  );
}


export function OrderTracker() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<ProductNameMap>({});
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerDocumentId, setCustomerDocumentId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<GeoPoint | null>(null);
  const [driverProfile, setDriverProfile] = useState<{
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [merchantLocation, setMerchantLocation] = useState<GeoPoint | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(true);

  const { showToast } = useNotificationToast();
  const bcvRate = useBCVRate();
  const { permission, showNotification } = useNotifications();
  const { isOnline } = useOnlineStatus();
  const previousStatusRef = useRef<OrderStatus | null>(null);

  const adminRoles: string[] = ['superadmin', 'merchant_owner', 'merchant_staff'];
  const canManageOrders = profile !== null && adminRoles.includes(profile.role);

  const handleStatusChange = useCallback(
    (newStatus: OrderStatus): void => {
      const notification = buildOrderNotification(newStatus);

      if (permission === 'granted') {
        // Recordatorio activo: persistente en pantalla de bloqueo, con
        // vibración y deep link al pedido.
        showNotification({
          ...notification,
          reminder: true,
          url: orderId ? `/orders/${orderId}` : undefined,
        });
      } else {
        showToast({
          title: notification.title,
          message: notification.body,
          variant:
            newStatus === 'cancelled'
              ? 'error'
              : newStatus === 'delivered'
                ? 'success'
                : newStatus === 'ready'
                  ? 'warning'
                  : 'info',
          durationMs: 6000,
        });
      }
    },
    [permission, showNotification, showToast, orderId],
  );

  /**
   * Recordatorio temporizado: el pedido lleva demasiado tiempo en un estado
   * que requiere acción del cliente. Se muestra por Service Worker y se
   * replica por Web Push para que llegue al resto de dispositivos.
   */
  const handleOrderReminder = useCallback(
    (reminder: ScheduledReminder): void => {
      const url = `/orders/${encodeURIComponent(reminder.orderId)}`;
      const payload = {
        title: reminder.title,
        body: reminder.body,
        tag: `order-reminder-${reminder.orderId}`,
        url,
        reminder: true,
      };

      if (permission === 'granted') {
        showNotification(payload);
      } else {
        showToast({
          title: reminder.title,
          message: reminder.body,
          variant: 'warning',
          durationMs: 8000,
        });
      }

      void sendOrderReminderPushNotification(reminder.orderId, reminder.title, reminder.body);
    },
    [permission, showNotification, showToast],
  );

  // Los recordatorios son para el cliente del pedido: un comercio o repartidor
  // que abra el tracker de otra persona no debe recibir los avisos de pago.
  const isCustomerOwner = order !== null && order.customer_id === user?.id;

  useOrderReminderScheduler({
    orderId: orderId ?? null,
    status: isCustomerOwner ? order.status : null,
    onReminder: handleOrderReminder,
  });

  const confirmDeliveryByClient = useCallback(async () => {
    if (!orderId || !order) return;

    try {
      setLoading(true);
      // UPDATE explícito ANTES de cambiar la vista local; lanza error si
      // RLS bloquea la fila (0 filas sin error) o si la mutación falla.
      const updated = await confirmOrderDelivery(orderId);
      if (isPostHogEnabled) {
        posthog.capture('order_received', { order_type: order.type });
      }

      // Update local state immediately so UI switches to celebration view
      setOrder((prev) => (prev ? { ...prev, status: updated.status } : null));

      showToast({
        title: '¡Entrega confirmada!',
        message: 'Gracias por confirmar la recepción de tu pedido.',
        variant: 'success',
        durationMs: 5000,
      });

      // Invalidate merchant orders query so the panel updates instantly
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      console.error('Error confirming delivery:', err);
      showToast({
        title: 'Error',
        message: 'No se pudo confirmar la entrega. Intenta de nuevo.',
        variant: 'error',
        durationMs: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, order, showToast, queryClient]);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('ID de orden no proporcionado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!data) {
        setError('Orden no encontrada');
        setLoading(false);
        return;
      }

      setOrder(data);
      previousStatusRef.current = data.status;
      setError(null);
      saveOrder(data);

      // Fetch product names, merchant name, and customer name in parallel
      const productIds = data.items?.map((item: { product_id: string }) => item.product_id) ?? [];

      const [productsResult, merchantResult, customerResult] = await Promise.all([
        productIds.length > 0
          ? supabase.from('products').select('id, title').in('id', productIds)
          : { data: [], error: null },
        supabase.from('merchants').select('name, location').eq('id', data.merchant_id).single(),
        data.customer_id
          ? supabase.from('profiles').select('full_name, phone, ci').eq('id', data.customer_id).single()
          : { data: null, error: null },
      ]);

      if (productsResult.data) {
        const nameMap: ProductNameMap = {};
        for (const p of productsResult.data) {
          nameMap[p.id] = p.title;
        }
        setProductNames(nameMap);
      }

      if (merchantResult.data) {
        setMerchantName(merchantResult.data.name);
        setMerchantLocation(parseGeoPoint(merchantResult.data.location));
      }

      if (customerResult.data) {
        setCustomerName(customerResult.data.full_name);
        setCustomerPhone(customerResult.data.phone ?? null);
        setCustomerDocumentId(customerResult.data.ci ?? null);
      }
    } catch (err) {
      console.error('Error loading order:', err);

      if (!isOnline) {
        const cachedOrder = getOrder(orderId);
        if (cachedOrder) {
          setOrder(cachedOrder);
          previousStatusRef.current = cachedOrder.status;
          setError(null);
          showToast({
            title: 'Modo sin conexión',
            message: 'Mostrando la última orden guardada localmente.',
            variant: 'warning',
            durationMs: 6000,
          });
        } else {
          setError('Error al cargar la orden. Activa la conexión para ver tu orden.');
          setOrder(null);
        }
      } else {
        setError('Error al cargar la orden');
        setOrder(null);
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, isOnline, showToast]);

  useEffect(() => {
    loadOrder();

    const channel = supabase
      .channel(`order-changes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as OrderRow;
          setOrder(updatedOrder);

          if (updatedOrder.status !== previousStatusRef.current) {
            previousStatusRef.current = updatedOrder.status;
            handleStatusChange(updatedOrder.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrder, orderId, handleStatusChange]);

  // Perfil del repartidor asignado: alimenta la tarjeta de navegación.
  useEffect(() => {
    const driverId = order?.driver_id;
    if (!driverId || order.status !== 'on_the_way') {
      setDriverProfile(null);
      return undefined;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', driverId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error !== null) return;
        setDriverProfile(data ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [order?.driver_id, order?.status]);

  // Subscribe to driver GPS location broadcast only while order is on the way
  useEffect(() => {
    if (!orderId || order?.status !== 'on_the_way') return undefined;

    const channel = supabase
      .channel(`driver_locations:${orderId}`)
      .on('broadcast', { event: 'driver_location' }, (payload) => {
        const data = payload.payload as { lat: number; lng: number } | undefined;
        if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          setDriverLocation({ x: data.lng, y: data.lat });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, order?.status]);

  // Reabre el mapa panorámico cada vez que la entrega pasa a "en camino".
  useEffect(() => {
    if (order?.status === 'on_the_way') setTrackingOpen(true);
  }, [order?.status]);

  // Auto-clear cached order after delivery/cancellation
  useEffect(() => {
    if (!order) return;
    if (order.status !== 'delivered' && order.status !== 'cancelled') return;

    const timer = setTimeout(() => {
      removeOrder(order.id);
    }, order.status === 'delivered' ? 60_000 : 0);

    return () => clearTimeout(timer);
  }, [order]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500">
        <h2 className="text-red-800 font-bold mb-2">Error</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="p-6 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Cargando orden...</h2>
        <p className="text-gray-600">Por favor espere mientras cargamos la información de su orden.</p>
      </div>
    );
  }

  // Flujo de pasos según el tipo: pickup/in_store omiten "En Camino".
  const orderStatusSteps = getOrderStatusFlow(order.type);

  const currentStepIndex = orderStatusSteps.indexOf(order.status);
  const isCompleted = order.status === 'delivered' || order.status === 'cancelled';
  const isPickupFlow = order.type === 'pickup' || order.type === 'in_store';
  const allowedTransitions = getAllowedTransitions(order.status, order.type);
  const deliveryCode = `#${order.id.slice(0, 8).toUpperCase()}`;

  // Show rejection modal when order is cancelled
  const showRejection = order.status === 'cancelled';

  // Destino de entrega: columna POINT o, en su defecto, lat/lng explícitas.
  const deliveryPoint: GeoPoint | null =
    parseGeoPoint(order.delivery_location) ??
    (order.latitude !== null && order.longitude !== null
      ? { x: order.longitude, y: order.latitude }
      : null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Seguimiento de Orden #{order.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-gray-600">
          Estado actual:{' '}
          <span className="font-medium text-gray-800">
            {statusDisplayMap[order.status]}
          </span>
        </p>
      </header>

      {showRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="rejection-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" aria-hidden="true" />
              <h2 id="rejection-title" className="text-xl font-bold text-red-700">Solicitud de pedido rechazada</h2>
            </div>
            <p className="text-gray-700 mb-6">
              {(order as any).rejection_reason ?? 'El comercio no puede atender tu pedido en este momento.'}
            </p>
            <button
              type="button"
              onClick={() => {
                removeOrder(order.id);
                navigate('/');
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-base font-semibold text-white shadow hover:bg-[#c80024] transition-colors"
              data-testid="accept-rejection"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <section
          className="mb-8 rounded-2xl border border-red-300 bg-red-50 p-6 shadow-md"
          role="alert"
          data-testid="order-cancelled-alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-red-800">Pedido cancelado</h2>
              <p className="mt-1 text-red-700">
                Tu pedido ha sido cancelado. Si tienes dudas o necesitas
                asistencia con tu reembolso/pago, por favor contacta al comercio.
              </p>
            </div>
          </div>
        </section>
      )}

      {isPickupFlow && order.status === 'ready' && !isCompleted && (
        <section
          className="mb-8 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center shadow-md"
          role="status"
          data-testid="pickup-ready-card"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <PackageCheck className="h-7 w-7 text-emerald-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800">
            ¡Tu pedido está listo!
          </h2>
          <p className="mt-2 text-emerald-700">
            Ya puedes venir a retirarlo en caja e indicar tu código de entrega:{' '}
            <span className="font-mono font-extrabold text-emerald-900">
              {deliveryCode}
            </span>
          </p>
        </section>
      )}

      <section
        className="mb-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center shadow-sm"
        data-testid="delivery-code-card"
      >
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
          Tu código de entrega
        </p>
        <p className="mt-1 font-mono text-4xl font-extrabold tracking-widest text-amber-900">
          {deliveryCode}
        </p>
        <p className="mt-2 text-sm text-amber-700">
          {isPickupFlow
            ? 'Indica este código en caja al retirar tu pedido.'
            : 'Comparte este código con el repartidor al recibir tu pedido.'}
        </p>
      </section>

      {/* Cliente confirma recepción del pedido. Cuando el panel de navegación
          está activo, el botón vive en su tarjeta inferior flotante; esta
          variante queda para el retiro en local y estados sin mapa. */}
      {(!isCompleted &&
        (order.status === 'on_the_way' || order.status === 'ready') &&
        order.customer_id === user?.id &&
        !(order.status === 'on_the_way' && isValidGeoPoint(deliveryPoint))) && (
        <section className="mb-8 bg-white rounded-lg shadow-md p-6 border border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3 mb-4">
            <PackageCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-emerald-800">Confirmar recepción del pedido</h3>
              <p className="text-sm text-emerald-700">
                {isPickupFlow
                  ? 'Al retirar tu pedido en caja, confirma aquí la recepción.'
                  : 'Al recibir tu pedido, confirma la entrega con el código de arriba.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={confirmDeliveryByClient}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="confirm-delivery"
          >
            <PackageCheck className="h-5 w-5" />
            Confirmar pedido recibido
          </button>
        </section>
      )}

      {order.status === 'delivered' && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">
            ¡Pedido entregado con éxito!
          </h2>
          <p className="text-emerald-700 mb-6 text-lg">
            ¡Gracias por tu compra!
          </p>
          <button
            type="button"
            onClick={() => {
              removeOrder(order.id);
              navigate('/');
            }}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors"
            data-testid="back-to-marketplace"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al catálogo
          </button>
        </div>
      )}

      <div className="mb-8 overflow-x-auto">
        <div className="flex items-start justify-between min-w-[600px]">
          {orderStatusSteps.map((status, index) => (
            <OrderStatusStep
              key={status}
              status={status}
              currentIndex={currentStepIndex}
              index={index}
              isCompleted={isCompleted}
              label={getOrderStatusLabel(status, order.type)}
            />
          ))}
        </div>
      </div>

      {order.status === 'on_the_way' && isValidGeoPoint(deliveryPoint) && (
        trackingOpen ? (
          <MapErrorBoundary fallbackMessage="No se pudo mostrar el mapa.">
            <OrderTrackingPanel
              driverLocation={driverLocation}
              destination={deliveryPoint}
              merchantPoint={merchantLocation}
              driverName={driverProfile?.full_name ?? null}
              driverPhone={driverProfile?.phone ?? null}
              driverAvatarUrl={driverProfile?.avatar_url ?? null}
              orderCode={deliveryCode}
              statusLabel={statusDisplayMap[order.status]}
              canConfirmDelivery={
                !isCompleted && order.status === 'on_the_way' && order.customer_id === user?.id
              }
              isConfirming={loading}
              onConfirmDelivery={() => void confirmDeliveryByClient()}
              onClose={() => setTrackingOpen(false)}
            />
          </MapErrorBoundary>
        ) : (
          <button
            type="button"
            onClick={() => setTrackingOpen(true)}
            data-testid="open-tracking-map"
            className="mb-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700"
          >
            <Navigation className="h-5 w-5" aria-hidden="true" />
            Ver seguimiento en vivo
          </button>
        )
      )}

      <div className="grid gap-6">
        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Resumen de la Orden</h2>

          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Fecha:</span>
              <span className="min-w-0 break-words text-right font-medium">
                {new Date(order.created_at).toLocaleDateString()}{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Tipo:</span>
              <span className="min-w-0 break-words text-right font-medium capitalize">
                {order.type}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Método de pago:</span>
              <span className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <span className="break-words font-medium">
                  {getPaymentMethodLabel(order.payment_method)}
                </span>
                {order.payment_method === 'pago_movil' &&
                  order.payment_reference && (
                    <span className="shrink-0 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      Ref: {order.payment_reference}
                    </span>
                  )}
              </span>
            </div>

            <DeliveryFeeRow
              orderType={order.type}
              fee={order.delivery_fee ?? '0'}
            />

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Total:</span>
              <span className="min-w-0 text-right">
                <span className="block font-medium text-lg">
                  {formatUSD(Number(order.total_amount))}
                </span>
                {bcvRate > 0 && (
                  <span
                    className="block text-sm font-semibold text-emerald-700"
                    data-testid="order-total-ves"
                  >
                    ≈ {formatVES(Number(order.total_amount) * bcvRate)}
                  </span>
                )}
              </span>
            </div>

            {order.table_number && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="shrink-0 text-gray-600">Mesa:</span>
                <span className="min-w-0 break-words font-medium">#{order.table_number}</span>
              </div>
            )}

            {(order.delivery_address || order.delivery_address_notes) && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="shrink-0 text-gray-600">
                  {order.delivery_address
                    ? 'Dirección de entrega:'
                    : 'Instrucciones de entrega:'}
                </span>
                <span className="min-w-0 break-words text-right text-gray-700">
                  {order.delivery_address ?? order.delivery_address_notes}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Productos del Pedido</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-gray-800">
                      {productNames[item.product_id] ?? `Producto #${item.product_id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity} x ${item.unit_price}</p>
                  </div>
                  <p className="shrink-0 break-words text-right font-bold text-gray-900">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-gray-200 text-right">
                <span className="text-gray-600 mr-2">Total:</span>
                <span className="text-xl font-bold text-emerald-600">${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No hay productos en esta orden.</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Información del Comercio</h2>
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Comercio:</span>
              <span className="min-w-0 break-words text-right font-medium">
                {merchantName ?? `Comercio #${order.merchant_id.slice(0, 8)}`}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="shrink-0 text-gray-600">Cliente:</span>
              <span className="min-w-0 break-words text-right font-medium">
                {customerName ?? (order.customer_id ? `Cliente #${order.customer_id.slice(0, 8)}` : 'Cliente invitado')}
              </span>
            </div>
            {customerPhone && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="shrink-0 text-gray-600">Teléfono:</span>
                <span className="min-w-0 break-words font-medium">{customerPhone}</span>
              </div>
            )}
            {customerDocumentId && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="shrink-0 text-gray-600">Cédula:</span>
                <span className="min-w-0 break-words font-mono font-medium">
                  {customerDocumentId}
                </span>
              </div>
            )}
          </div>
        </section>

        {!isCompleted && canManageOrders && allowedTransitions.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Transiciones disponibles:</p>
              <div className="flex flex-wrap gap-2">
                {allowedTransitions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => setExpandedStep(expandedStep === nextStatus ? null : nextStatus)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      expandedStep === nextStatus
                        ? 'bg-brand-red text-white'
                        : getTransitionButtonClass(nextStatus)
                    }`}
                    data-testid={`transition-${nextStatus}`}
                  >
                    {expandedStep === nextStatus ? 'Cerrar' : getTransitionLabel(nextStatus)}
                  </button>
                ))}
              </div>
              {expandedStep && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">
                    Cambiar estado a: <strong>{getOrderStatusLabel(expandedStep as OrderStatus)}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}