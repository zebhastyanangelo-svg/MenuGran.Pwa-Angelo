import { BarChart3, ClipboardList, Store, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PlatformDistributionChart } from '../../components/superadmin/PlatformDistributionChart';
import { RevenueTrendChart } from '../../components/superadmin/RevenueTrendChart';
import { OrdersStatusChart } from '../../components/superadmin/OrdersStatusChart';
import { useSuperAdminMetrics } from '../../hooks/useSuperAdminMetrics';
import { useSuperAdminOrderTrends } from '../../hooks/useSuperAdminOrderTrends';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-brand-red">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900" data-testid={`metric-${label}`}>
          {value}
        </p>
      </div>
    </Card>
  );
}

/**
 * Gráficas del dashboard del Super Admin. Se renderizan sólo cuando las
 * métricas globales ya cargaron; cada gráfica gestiona su propio estado de
 * carga (esqueleto) mientras llegan los datos de tendencias de pedidos.
 */
function MetricsChartsSection({
  metrics,
  revenueTrend,
  ordersStatusTrend,
  trendsLoading,
  trendsError,
}: {
  metrics: NonNullable<ReturnType<typeof useSuperAdminMetrics>['metrics']>;
  revenueTrend: ReturnType<typeof useSuperAdminOrderTrends>['revenueTrend'];
  ordersStatusTrend: ReturnType<typeof useSuperAdminOrderTrends>['ordersStatusTrend'];
  trendsLoading: boolean;
  trendsError: string | null;
}) {
  return (
    <section
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      aria-label="Gráficas de métricas"
    >
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Distribución global de la plataforma
        </h2>
        <PlatformDistributionChart metrics={metrics} isLoading={false} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Tendencia de ingresos (últimos 30 días)
        </h2>
        <RevenueTrendChart
          data={revenueTrend}
          isLoading={trendsLoading}
          error={trendsError}
        />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Pedidos por estado (últimos 30 días)
        </h2>
        <OrdersStatusChart
          data={ordersStatusTrend}
          isLoading={trendsLoading}
          error={trendsError}
        />
      </Card>
    </section>
  );
}

/** Dashboard global de métricas de la plataforma (rol superadmin). */
export function SuperAdminDashboardPage() {
  const { metrics, isLoading, error } = useSuperAdminMetrics();
  const {
    revenueTrend,
    ordersStatusTrend,
    isLoading: trendsLoading,
    error: trendsError,
  } = useSuperAdminOrderTrends();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
            <BarChart3 className="h-5 w-5 text-brand-red" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Métricas Globales
            </h1>
            <p className="text-sm text-gray-500">
              Resumen general de la plataforma MenuGram.
            </p>
          </div>
        </header>

        {error !== null && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-600" role="status">
            Cargando métricas...
          </p>
        ) : (
          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            aria-label="Métricas de la plataforma"
          >
            <MetricCard
              icon={<Store className="h-6 w-6" aria-hidden="true" />}
              label="Comercios registrados"
              value={String(metrics?.totalMerchants ?? 0)}
            />
            <MetricCard
              icon={<Users className="h-6 w-6" aria-hidden="true" />}
              label="Usuarios clientes"
              value={String(metrics?.totalCustomers ?? 0)}
            />
            <MetricCard
              icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
              label="Pedidos globales"
              value={String(metrics?.totalOrders ?? 0)}
            />
          </section>
        )}

        {metrics !== null && !isLoading && (
          <MetricsChartsSection
            metrics={metrics}
            revenueTrend={revenueTrend}
            ordersStatusTrend={ordersStatusTrend}
            trendsLoading={trendsLoading}
            trendsError={trendsError}
          />
        )}
      </div>
    </div>
  );
}

export default SuperAdminDashboardPage;
