import { BarChart3, ClipboardList, Store, Users, DollarSign, MapPin, Megaphone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PlatformDistributionChart } from '../../components/superadmin/PlatformDistributionChart';
import { RevenueTrendChart } from '../../components/superadmin/RevenueTrendChart';
import { OrdersStatusChart } from '../../components/superadmin/OrdersStatusChart';
import { BulkNotificationModal } from '../../components/superadmin/BulkNotificationModal';
import { useSuperAdminMetrics } from '../../hooks/useSuperAdminMetrics';
import { useSuperAdminOrderTrends } from '../../hooks/useSuperAdminOrderTrends';
import { useBCVRate } from '../../hooks/useExchangeRate';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { parseGeoPoint } from '../../utils/geoPoint';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MerchantMapRow {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  is_open: boolean;
  location: unknown;
}

interface MerchantMapMarker {
  id: string;
  name: string;
  address: string;
  category: string;
  is_open: boolean;
  location: { x: number; y: number } | null;
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
  const bcvRate = useBCVRate();

  const [merchants, setMerchants] = useState<MerchantMapMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [showBulkNotificationModal, setShowBulkNotificationModal] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Fetch merchants with location for map
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('merchants')
      .select('id, name, address, category, is_open, location')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching merchants for map', error);
          return;
        }
        if (data) {
          const rows = data as unknown as MerchantMapRow[];
          setMerchants(
            rows.map((m) => ({
              id: m.id,
              name: m.name,
              address: m.address ?? 'Sin dirección',
              category: m.category ?? 'Sin categoría',
              is_open: m.is_open,
              location: parseGeoPoint(m.location),
            }))
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Initialize Leaflet map after merchants loaded
  useEffect(() => {
    if (merchants.length === 0 || mapReady) return;
    const container = mapRef.current;
    if (!container) return;
    const map = L.map(container).setView([10.5, -66.9], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    merchants.forEach((m) => {
      if (m.location && typeof m.location.x === 'number' && typeof m.location.y === 'number') {
        const color = m.is_open ? '#22c55e' : '#ef4444';
        const marker = L.circleMarker([m.location.y, m.location.x], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 1,
          fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(`<strong>${m.name}</strong><br/>${m.address}<br/>${m.category}`);
      }
    });
    setMapReady(true);
  }, [merchants, mapReady]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
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
          </div>
          {/* BCV Rate widget */}
          <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 shadow-sm">
            <DollarSign className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <span className="font-semibold text-gray-900">
              Tasa BCV: Bs. {bcvRate > 0 ? bcvRate.toFixed(2) : '—'}
            </span>
          </div>
        </header>

        {error !== null && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Envío masivo de notificaciones push a clientes */}
        <section aria-label="Notificaciones push a clientes">
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Megaphone className="h-5 w-5 text-brand-red" aria-hidden="true" />
                Notificaciones Push a Clientes
              </h2>
              <p className="text-sm text-gray-500">
                Envía una notificación masiva a todos los clientes con notificaciones activas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkNotificationModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
            >
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              Enviar Notificación Masiva a Clientes
            </button>
          </Card>
        </section>

        {showBulkNotificationModal && (
          <BulkNotificationModal onClose={() => setShowBulkNotificationModal(false)} />
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

        {/* Mapa global de comercios */}
        <section aria-label="Mapa global de comercios">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-red" aria-hidden="true" />
            Mapa Global de Comercios
          </h2>
          <Card className="p-0 overflow-hidden">
            <div
              ref={mapRef}
              style={{ height: '400px', width: '100%' }}
              role="application"
              aria-label="Mapa de comercios"
            />
          </Card>
        </section>
      </div>
    </div>
  );
}

export default SuperAdminDashboardPage;
