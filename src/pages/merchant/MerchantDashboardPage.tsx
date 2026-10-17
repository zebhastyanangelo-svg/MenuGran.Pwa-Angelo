import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboardPage } from '../../hooks/useMerchantDashboardPage';
import { useMerchantPopularity } from '../../hooks/useMerchantPopularity';
import { useMerchantDeliveryMetrics } from '../../hooks/useMerchantDeliveryMetrics';
import { useMerchantPagoMovil } from '../../hooks/useMerchantPagoMovil';
import { MerchantPopularityCard } from '../../components/merchant/MerchantPopularityCard';
import { MerchantDeliveriesCard } from '../../components/merchant/MerchantDeliveriesCard';
import { OrdersBoard } from '../../components/merchant/OrdersBoard';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../services/supabase';
import { PaymentProofLightbox } from '../../components/merchant/PaymentProofLightbox';
import { Modal } from '../../components/ui/Modal';
import type { OrderStatus } from '../../types/database';
import { shouldNotifyNewOrder } from '../../utils/orderNotificationRules';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { buildWhatsAppUrl } from '../../utils/delivery';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import posthog, { isPostHogEnabled } from '../../posthog';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatAmount(value: number): string {
  return `Bs ${value.toFixed(2)}`;
}

/**
 * Texto con el que el comercio le reclama al cliente la referencia bancaria que
 * no coincide con el pago. Va precargado en WhatsApp porque no existe un canal
 * backend para devolver la orden a un estado de "esperando referencia".
 */
function buildReferenceRequestMessage(order: OrderWithCustomer): string {
  return `Hola ${order.profiles?.full_name ?? ''}, gracias por tu pedido. No pudimos validar tu pago móvil. ¿Podrías enviarnos la referencia bancaria para confirmarlo?`;
}

/**
 * Muestra la notificación de nuevo pedido preferentemente vía Service
 * Worker (`registration.showNotification`) para que llegue también con la
 * PWA en segundo plano; si el SW no está disponible, cae al constructor
 * `Notification`. Nunca lanza: el fallo no debe romper el flujo del pedido.
 */
async function showOrderNotification(orderId: string, amount: number): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = 'Nuevo pedido';
  const body = `Pedido #${orderId} por Bs ${amount.toFixed(2)}`;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag: `new-order-${orderId}`,
        data: { url: '/merchant' },
      });
      return;
    }
  } catch (error) {
    console.warn('[new-order] SW no disponible, usando notificación local:', error);
  }
  try {
    new Notification(title, { body, tag: `new-order-${orderId}` });
  } catch {
    // Notifications not supported in this environment
  }
}

export function MerchantDashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    permissions: staffPermissions,
    isLoading: isLoadingStaffPermissions,
    hasError: hasStaffPermissionsError,
  } = useStaffPermissions();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Notificaciones de nuevos pedidos filtradas por rol: el dueño y el
  // superadmin ven todo; el staff solo si gestiona pedidos; el repartidor
  // nunca (solo recibe el push de entrega asignada).
  const notifyNewOrders = shouldNotifyNewOrder(profile?.role, staffPermissions);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext not available or blocked by browser
    }
  }, [soundEnabled]);

  const handleNewOrder = useCallback(
    (order: OrderWithCustomer) => {
      if (!notifyNewOrders) return;
      playNotificationSound();
      showToast({
        variant: 'success',
        title: 'Nuevo pedido',
        message: `Pedido #${order.id} por Bs ${Number(order.total_amount ?? 0).toFixed(2)}`,
      });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        void showOrderNotification(order.id, Number(order.total_amount ?? 0));
      }
    },
    [playNotificationSound, showToast, notifyNewOrders],
  );

  const dashboardOptions = useMemo(
    () => ({ onNewOrder: handleNewOrder }),
    [handleNewOrder],
  );

  const {
    merchantId,
    merchantName,
    isOpen,
    activeProducts,
    orders,
    drivers = [],
    loading,
    error,
    toggleStoreOpen,
    updateOrderStatus,
    assignDriver,
  } = useMerchantDashboardPage(user, dashboardOptions);

  // Popularidad: valoraciones de clientes que impactan la visibilidad del
  // comercio en el marketplace.
  const {
    summary: popularitySummary,
    isLoading: popularityLoading,
    error: popularityError,
  } = useMerchantPopularity(merchantId);

  // Calificaciones de delivery: estrellas por repartidor y resumen del equipo.
  const {
    metrics: deliveryMetrics,
    isLoading: deliveryMetricsLoading,
    error: deliveryMetricsError,
  } = useMerchantDeliveryMetrics(merchantId);

  // Datos bancarios del comercio: la tarjeta de conciliación los contrasta
  // contra el capture que adjunta el cliente.
  const { pagoMovil } = useMerchantPagoMovil(merchantId);

  const greetingName = merchantName ?? profile?.full_name ?? 'Comercio';
  const isStaff = profile?.role === 'merchant_staff';

  // Payment proof lightbox state
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // Driver assignment modal state
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverModalOrder, setDriverModalOrder] = useState<OrderWithCustomer | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const handleOpenProof = useCallback(async (order: OrderWithCustomer) => {
    setSelectedOrder(order);
    setProofUrl(null);
    setProofError(null);
    if (!order.payment_proof_url) return;
    try {
      const { data, error: signedError } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .createSignedUrl(order.payment_proof_url, 60);
      if (signedError || !data?.signedUrl) {
        setProofError(
          signedError?.message ?? 'No se pudo cargar el comprobante',
        );
        return;
      }
      setProofUrl(data.signedUrl);
    } catch (err: unknown) {
      setProofError(err instanceof Error ? err.message : 'Error de comprobante');
    }
  }, []);

  const handleCloseProof = useCallback(() => {
    setSelectedOrder(null);
    setProofUrl(null);
    setProofError(null);
  }, []);

  const handleOpenDriverModal = useCallback((order: OrderWithCustomer) => {
    setDriverModalOrder(order);
    const currentDriverId = order.driver_id ?? null;
    if (currentDriverId) {
      setSelectedDriverId(currentDriverId);
    } else if (drivers.length === 1) {
      setSelectedDriverId(drivers[0]?.id ?? null);
    } else {
      setSelectedDriverId(null);
    }
    setAssignError(null);
    setDriverModalOpen(true);
  }, [drivers]);

  const handleCloseDriverModal = useCallback(() => {
    setDriverModalOpen(false);
    setDriverModalOrder(null);
    setSelectedDriverId(null);
    setAssignError(null);
    setAssignSubmitting(false);
  }, []);

  const handleAssignDriver = useCallback(async (orderId: string, driverId: string | null) => {
    await assignDriver(orderId, driverId);
    if (isPostHogEnabled) {
      posthog.capture('driver_assigned');
    }
  }, [assignDriver]);

  const handleConfirmAssignDriver = useCallback(async () => {
    if (!driverModalOrder) return;
    if (!selectedDriverId) {
      setAssignError('Selecciona un repartidor antes de enviar.');
      return;
    }
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      await handleAssignDriver(driverModalOrder.id, selectedDriverId);
      handleCloseDriverModal();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'No se pudo asignar el repartidor');
      setAssignSubmitting(false);
    }
  }, [driverModalOrder, selectedDriverId, handleAssignDriver, handleCloseDriverModal]);

  const handleUnassignDriver = useCallback(async () => {
    if (!driverModalOrder) return;
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      await assignDriver(driverModalOrder.id, null);
      handleCloseDriverModal();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'No se pudo quitar la asignación');
      setAssignSubmitting(false);
    }
  }, [driverModalOrder, assignDriver, handleCloseDriverModal]);

  // Check if the merchant has a store assigned
  const hasStore = !!merchantName;

  async function handleLogout() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      // signOut may throw; navigate anyway
      navigate('/login', { replace: true });
    }
  }

  const { ordersToday, salesToday } = useMemo(() => {
    const today = startOfToday();
    const todays = orders.filter(
      (order) => new Date(order.created_at) >= today,
    );
    const sales = todays
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    return { ordersToday: todays.length, salesToday: sales };
  }, [orders]);

  function handleToggle() {
    void toggleStoreOpen(!isOpen);
  }

  async function handleOrderAction(
    order: OrderWithCustomer,
    next: OrderStatus,
  ): Promise<void> {
    await updateOrderStatus(order.id, next);
    if (isPostHogEnabled) {
      posthog.capture('order_status_changed', { status: next, order_type: order.type });
    }
  }

  /** El tablero entrega solo el id: el tipo se recupera del listado en vivo. */
  function handleBoardStatusChange(orderId: string, next: OrderStatus): void {
    const order = orders.find((candidate) => candidate.id === orderId);
    if (order) void handleOrderAction(order, next);
  }

  /**
   * El tablero no puede devolver el pedido a un estado de "esperando
   * referencia" porque el flujo no tiene esa transición, así que la caja
   * reclama el dato al cliente por su canal de contacto.
   */
  const handleRequestReference = useCallback((order: OrderWithCustomer) => {
    const phone = order.profiles?.phone;
    const url = phone ? buildWhatsAppUrl(phone) : null;
    if (!url) {
      showToast({
        variant: 'warning',
        title: 'Sin teléfono del cliente',
        message: 'El cliente no registró un teléfono para pedirle la referencia.',
      });
      return;
    }
    window.open(
      `${url}?text=${encodeURIComponent(buildReferenceRequestMessage(order))}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [showToast]);

  const handleSyncOrders = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['merchantOrders'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {!hasStore && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-xl font-bold text-slate-600 mb-2">
            Tu cuenta de comercio está en proceso de verificación
          </p>
          <p className="text-slate-500 mb-6">
            Si aún no has registrado tu negocio, contáctanos
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="https://wa.me/58414xxxxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-red text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-brand-red-dark transition-colors"
            >
              Contactar por WhatsApp
            </a>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Ir al Inicio
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-red-600 border border-red-200 bg-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
      {hasStore && (
        <div className="max-w-5xl mx-auto space-y-6">
          {isStaff && (
            <div
              className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid="staff-welcome-banner"
            >
              <div>
                <p className="text-base font-semibold text-indigo-900">
                  Hola, {profile?.full_name ?? 'Empleado'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-indigo-700">
                  <span className="inline-flex items-center rounded-full bg-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    Rol: Empleado
                  </span>
                  {merchantName && (
                    <span className="text-indigo-600">
                      {merchantName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
                data-testid="staff-logout-button"
              >
                <i className="fa-solid fa-right-from-bracket text-base" />
                Cerrar sesión
              </button>
            </div>
          )}
          <header className="flex flex-col gap-3 bg-white rounded-xl shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Hola, {greetingName}
              </h1>
              <p className="text-sm text-gray-500">
                Este es el resumen de tu negocio hoy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                  setSoundEnabled((prev) => !prev);
                }}
                aria-pressed={soundEnabled}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  soundEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
              </button>
              <button
                type="button"
                onClick={handleToggle}
                aria-pressed={isOpen}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isOpen
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <i className="fa-solid fa-store text-base" />
                {isOpen ? 'Tienda Abierta' : 'Tienda Cerrada'}
              </button>
            </div>
          </header>

          {error && (
            <p className="text-red-600 text-sm" role="alert">
              {error}
            </p>
          )}

          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Métricas del día"
          >
            <MetricCard
              icon={<i className="fa-solid fa-clipboard-list text-xl text-indigo-600" />}
              label="Pedidos hoy"
              value={String(ordersToday)}
            />
            <MetricCard
              icon={<i className="fa-solid fa-arrow-trend-up text-xl text-emerald-600" />}
              label="Ventas hoy"
              value={formatAmount(salesToday)}
            />
            <MetricCard
              icon={<i className="fa-solid fa-box text-xl text-amber-600" />}
              label="Productos activos"
              value={String(activeProducts)}
            />
            <MerchantPopularityCard
              summary={popularitySummary}
              isLoading={popularityLoading}
              error={popularityError}
            />
          </section>

          <section
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            aria-label="Calificaciones de delivery"
          >
            <MerchantDeliveriesCard
              metrics={deliveryMetrics}
              drivers={drivers}
              isLoading={deliveryMetricsLoading}
              error={deliveryMetricsError}
            />
          </section>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
              <i className="fa-solid fa-spinner text-base animate-spin" aria-hidden="true" />
              Cargando pedidos...
            </p>
          ) : (
            <OrdersBoard
              orders={orders}
              drivers={drivers}
              role={profile?.role ?? null}
              staffPermissions={staffPermissions}
              permissionsPending={isLoadingStaffPermissions || hasStaffPermissionsError}
              pagoMovil={pagoMovil}
              onUpdateStatus={handleBoardStatusChange}
              onAssignDriver={(orderId, driverId) => void handleAssignDriver(orderId, driverId)}
              onOpenDriverAssignment={handleOpenDriverModal}
              onOpenProof={handleOpenProof}
              onRequestReference={handleRequestReference}
              onSync={handleSyncOrders}
            />
          )}
        </div>
      )}
      {selectedOrder && selectedOrder.payment_proof_url && (
        <PaymentProofLightbox
          order={selectedOrder}
          proofUrl={proofUrl ?? ''}
          error={proofError}
          onClose={handleCloseProof}
        />
      )}
      <Modal
        isOpen={driverModalOpen}
        onClose={handleCloseDriverModal}
        title="Asignar repartidor"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {driverModalOrder?.driver_id ? (
              <button
                type="button"
                onClick={() => void handleUnassignDriver()}
                disabled={assignSubmitting}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                data-testid="assign-driver-unassign"
              >
                Quitar asignación
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCloseDriverModal}
                disabled={assignSubmitting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                data-testid="assign-driver-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAssignDriver()}
                disabled={assignSubmitting || !selectedDriverId}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                data-testid="assign-driver-submit"
              >
                {assignSubmitting && <i className="fa-solid fa-spinner text-base animate-spin" />}
                Enviar
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Pedido #{driverModalOrder?.id?.slice(0, 8).toUpperCase()} — Selecciona un repartidor:
          </p>
          {drivers.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Este comercio aún no tiene repartidores registrados.
            </p>
          ) : drivers.length === 1 ? (
            <button
              type="button"
              onClick={() => setSelectedDriverId(drivers[0]?.id ?? null)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-indigo-300 bg-indigo-50 text-sm text-indigo-800 flex items-center gap-3"
              data-testid={`assign-driver-option-${drivers[0]?.id ?? 'single'}`}
            >
              <i className="fa-solid fa-user text-base shrink-0 text-indigo-500" />
              <span className="font-medium">
                {drivers[0]?.full_name ?? drivers[0]?.email ?? drivers[0]?.id}
              </span>
              <span className="ml-auto text-xs font-semibold text-indigo-600">Listo para enviar</span>
            </button>
          ) : (
            drivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id;
              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => setSelectedDriverId(driver.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  data-testid={`assign-driver-option-${driver.id}`}
                >
                  <i className="fa-solid fa-user text-base shrink-0 text-gray-400" />
                  <span className="font-medium">{driver.full_name ?? driver.email ?? driver.id}</span>
                  {isSelected && (
                    <span className="ml-auto text-xs font-semibold text-indigo-600">Seleccionado</span>
                  )}
                </button>
              );
            })
          )}
          {assignError && (
            <p className="text-sm text-red-600 mt-2" role="alert" data-testid="assign-driver-error">
              {assignError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="break-words text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboardPage;
