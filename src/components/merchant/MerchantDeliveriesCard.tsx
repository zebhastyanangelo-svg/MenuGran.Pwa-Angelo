import type { RatingSummary } from '../../services/orderRatingService';
import type { MerchantDeliveryMetrics } from '../../services/orderRatingService';
import type { DriverProfile } from '../../hooks/useMerchantDashboardPage';

export interface MerchantDeliveriesCardProps {
  metrics: MerchantDeliveryMetrics | null;
  drivers: DriverProfile[];
  isLoading: boolean;
  error: string | null;
}

/** Formatea el promedio con un decimal venezolano (4,5). */
function formatAverage(average: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

function formatStars(average: number, count: number): string {
  if (count === 0) return '—';
  return `${formatAverage(average)} ★`;
}

/**
 * Nivel derivado del promedio de estrellas, para colorear el resumen.
 */
export function deriveDeliveryLevel(summary: RatingSummary | null): string {
  if (summary === null || summary.count === 0) return 'sin_valoraciones';
  if (summary.average >= 4.5) return 'excelente';
  if (summary.average >= 4) return 'muy_buena';
  if (summary.average >= 3) return 'buena';
  return 'mejorable';
}

const LEVEL_TEXT: Record<string, string> = {
  sin_valoraciones: 'Sin valoraciones',
  mejorable: 'Mejorable',
  buena: 'Buena',
  muy_buena: 'Muy buena',
  excelente: 'Excelente',
};

const LEVEL_COLOR: Record<string, string> = {
  sin_valoraciones: 'text-slate-500',
  mejorable: 'text-red-600',
  buena: 'text-amber-600',
  muy_buena: 'text-emerald-600',
  excelente: 'text-emerald-700',
};

/**
 * Sección de deliveries del panel del comercio: muestra cuántos repartidores
 * tiene asignados, el promedio de estrellas individual de cada uno y un
 * resumen global del equipo de entrega.
 */
export function MerchantDeliveriesCard({
  metrics,
  drivers,
  isLoading,
  error,
}: MerchantDeliveriesCardProps) {
  return (
    <div
      className="min-w-0 rounded-xl bg-white p-4 shadow-sm"
      aria-label="Desempeño del equipo de delivery"
      data-testid="merchant-deliveries-card"
    >
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-truck-fast text-xl text-indigo-600" aria-hidden="true" />
        <p className="text-sm text-gray-500">Deliveries</p>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400" role="status">
          Cargando calificaciones…
        </p>
      ) : error !== null ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-gray-500">
              {drivers.length} {drivers.length === 1 ? 'repartidor' : 'repartidores'}
            </span>
            <span
              className={`text-sm font-bold ${LEVEL_COLOR[deriveDeliveryLevel(metrics?.overall ?? null)]}`}
              data-testid="delivery-overall-summary"
            >
              {metrics !== null && metrics.overall.count > 0
                ? `${formatAverage(metrics.overall.average)} ★ · ${metrics.overall.count} calificaciones`
                : 'Sin valoraciones'}
            </span>
          </div>

          {metrics === null || metrics.drivers.length === 0 ? (
            <p className="text-xs text-gray-500">
              Aún no hay calificaciones de entrega para tu equipo.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100" aria-label="Calificaciones por repartidor">
              {metrics.drivers.map((entry) => {
                const profile = drivers.find((driver) => driver.id === entry.driverId);
                const name = profile?.full_name ?? profile?.email ?? 'Repartidor';
                return (
                  <li
                    key={entry.driverId}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                    data-testid={`delivery-driver-rating-${entry.driverId}`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-gray-700">
                      <i className="fa-solid fa-user shrink-0 text-sm text-gray-400" aria-hidden="true" />
                      <span className="truncate font-medium">{name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900">
                      {formatStars(entry.summary.average, entry.summary.count)}
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        ({entry.summary.count})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className={`text-xs font-medium ${LEVEL_COLOR[deriveDeliveryLevel(metrics?.overall ?? null)]}`} data-testid="delivery-overall-level">
            {LEVEL_TEXT[deriveDeliveryLevel(metrics?.overall ?? null)]}
          </p>
        </div>
      )}
    </div>
  );
}

export default MerchantDeliveriesCard;
