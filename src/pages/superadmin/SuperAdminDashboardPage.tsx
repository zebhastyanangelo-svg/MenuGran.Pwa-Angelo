import { BarChart3, ClipboardList, Store, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PlatformDistributionChart } from '../../components/superadmin/PlatformDistributionChart';
import { useSuperAdminMetrics } from '../../hooks/useSuperAdminMetrics';

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

/** Dashboard global de métricas de la plataforma (rol superadmin). */
export function SuperAdminDashboardPage() {
  const { metrics, isLoading, error } = useSuperAdminMetrics();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
           <Card className="p-5">
             <h2 className="mb-3 text-sm font-semibold text-slate-500">
               Distribución global de la plataforma
             </h2>
             <PlatformDistributionChart
               metrics={metrics}
               isLoading={false}
             />
           </Card>
         )}
       </div>
     </div>
   );
 }

 export default SuperAdminDashboardPage;
