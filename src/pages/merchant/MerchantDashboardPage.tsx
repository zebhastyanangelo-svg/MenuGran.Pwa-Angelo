import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboardPage } from '../../hooks/useMerchantDashboardPage';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../services/supabase';
import { PaymentProofLightbox } from '../../components/merchant/PaymentProofLightbox';
import { Modal } from '../../components/ui/Modal';
import { Store, Loader2, Package, ClipboardList, TrendingUp, LogOut, Image as ImageIcon, Truck, User } from 'lucide-react';
import type { OrderStatus } from '../../types/database';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';

const PAYMENT_PROOF_BUCKET = 'payment-proofs';

type TabKey = 'pending' | 'preparing' | 'ready' | 'delivered';

interface TabConfig {
  key: TabKey;
  label: string;
  statuses: OrderStatus[];
}

const TABS: TabConfig[] = [
  { key: 'pending', label: 'Pendientes', statuses: ['payment_pending', 'confirmed'] },
  { key: 'preparing', label: 'En Preparación', statuses: ['preparing'] },
  { key: 'ready', label: 'Listos', statuses: ['ready'] },
  { key: 'delivered', label: 'Entregados', statuses: ['delivered'] },
];

interface OrderAction {
  label: string;
  next: OrderStatus;
}

function getOrderActions(status: OrderStatus): OrderAction[] {
  switch (status) {
    case 'payment_pending':
      return [
        { label: 'Aceptar', next: 'confirmed' },
        { label: 'Cancelar', next: 'cancelled' },
      ];
    case 'confirmed':
      return [
        { label: 'Aceptar', next: 'preparing' },
        { label: 'Cancelar', next: 'cancelled' },
      ];
    case 'preparing':
      return [
        { label: 'Listo', next: 'ready' },
        { label: 'Cancelar', next: 'cancelled' },
      ];
    case 'ready':
      return [{ label: 'Listo', next: 'delivered' }];
    default:
      return [];
  }
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatAmount(value: number): string {
  return `Bs ${value.toFixed(2)}`;
}

export function MerchantDashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
      playNotificationSound();
      showToast({
        variant: 'success',
        title: 'Nuevo pedido',
        message: `Pedido #${order.id} por Bs ${Number(order.total_amount ?? 0).toFixed(2)}`,
      });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Nuevo pedido', {
            body: `Pedido #${order.id} por Bs ${Number(order.total_amount ?? 0).toFixed(2)}`,
          });
        } catch {
          // Notifications not supported in this environment
        }
      }
    },
    [playNotificationSound, showToast],
  );

  const dashboardOptions = useMemo(
    () => ({ onNewOrder: handleNewOrder }),
    [handleNewOrder],
  );

  const {
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
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
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

  const handleConfirmAssignDriver = useCallback(async () => {
    if (!driverModalOrder) return;
    if (!selectedDriverId) {
      setAssignError('Selecciona un repartidor antes de enviar.');
      return;
    }
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      await assignDriver(driverModalOrder.id, selectedDriverId);
      handleCloseDriverModal();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'No se pudo asignar el repartidor');
      setAssignSubmitting(false);
    }
  }, [driverModalOrder, selectedDriverId, assignDriver, handleCloseDriverModal]);

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

  const activeStatuses =
    TABS.find((tab) => tab.key === activeTab)?.statuses ?? [];
  const visibleOrders = orders.filter((order) =>
    activeStatuses.includes(order.status),
  );

  function handleToggle() {
    void toggleStoreOpen(!isOpen);
  }

  function handleAction(order: OrderWithCustomer, next: OrderStatus) {
    void updateOrderStatus(order.id, next);
  }

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
          <div className="mt-4">
            <a
              href="https://wa.me/58414xxxxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-red text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-[#c80024] transition-colors"
            >
              Contactar por WhatsApp
            </a>
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
                <LogOut className="h-4 w-4" />
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
                <Store className="h-4 w-4" />
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
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            aria-label="Métricas del día"
          >
            <MetricCard
              icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
              label="Pedidos hoy"
              value={String(ordersToday)}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
              label="Ventas hoy"
              value={formatAmount(salesToday)}
            />
            <MetricCard
              icon={<Package className="h-5 w-5 text-amber-600" />}
              label="Productos activos"
              value={String(activeProducts)}
            />
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <nav
              className="flex gap-2 overflow-x-auto"
              aria-label="Filtrar pedidos por estado"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={activeTab === tab.key}
                  className={`flex-1 min-w-[7rem] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {loading ? (
              <p className="flex items-center gap-2 text-gray-600 text-sm" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando pedidos...
              </p>
            ) : visibleOrders.length === 0 ? (
              <p className="text-gray-600 text-sm" role="status">
                No hay pedidos en esta sección.
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleOrders.map((order) => (
                  <li
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">#{order.id}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatAmount(Number(order.total_amount ?? 0))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {order.items.length} producto(s) ·{' '}
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                    {order.payment_proof_url ? (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => void handleOpenProof(order)}
                          className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded font-medium transition-colors"
                          data-testid={`proof-button-${order.id}`}
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Ver comprobante
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic mt-1 block">
                        Sin capture
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {getOrderActions(order.status).map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleAction(order, action.next)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            action.label === 'Cancelar'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                    {order.type === 'delivery' && drivers.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        {order.driver_id ? (
                          <span className="inline-flex items-center gap-1.5 text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
                            <Truck className="h-4 w-4" />
                            Asignado a {drivers.find((d) => d.id === order.driver_id)?.full_name ?? 'Repartidor'}
                          </span>
                        ) : order.status !== 'delivered' && order.status !== 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => void handleOpenDriverModal(order)}
                            className="inline-flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            data-testid={`assign-driver-${order.id}`}
                          >
                            <Truck className="h-4 w-4" />
                            Asignar al repartidor
                          </button>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
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
                {assignSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <User className="h-4 w-4 shrink-0 text-indigo-500" />
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
                  <User className="h-4 w-4 shrink-0 text-gray-400" />
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
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default MerchantDashboardPage;
