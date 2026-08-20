import { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboardPage } from '../../hooks/useMerchantDashboardPage';
import { Store, Loader2, Package, ClipboardList, TrendingUp } from 'lucide-react';
import type { OrderRow, OrderStatus } from '../../types/database';

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
  const { user, profile } = useAuth();
  const {
    merchantName,
    isOpen,
    activeProducts,
    orders,
    loading,
    error,
    toggleStoreOpen,
    updateOrderStatus,
  } = useMerchantDashboardPage(user);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const greetingName = merchantName ?? profile?.full_name ?? 'Comercio';

  // Check if the merchant has a store assigned
  const hasStore = !!merchantName;

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

  function handleAction(order: OrderRow, next: OrderStatus) {
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
          <header className="flex flex-col gap-3 bg-white rounded-xl shadow-sm p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Hola, {greetingName}
              </h1>
              <p className="text-sm text-gray-500">
                Este es el resumen de tu negocio hoy.
              </p>
            </div>
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
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
