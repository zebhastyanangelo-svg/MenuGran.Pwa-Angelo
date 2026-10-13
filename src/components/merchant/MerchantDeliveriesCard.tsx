import type { RatingSummary, SatisfactionBreakdown } from '../../services/orderRatingService';
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

/** Desglose vacío para datos antiguos o ausentes sin romper el render. */
const EMPTY_BREAKDOWN: SatisfactionBreakdown = { satisfied: 0, neutral: 0, complaints: 0 };

function readBreakdown(breakdown: SatisfactionBreakdown | undefined): SatisfactionBreakdown {
  return breakdown ?? EMPTY_BREAKDOWN;
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

/** Chip compacto con icono, cifra y etiqueta (satisfechos / quejas). */
function BreakdownChip({
  icon,
  count,
  label,
  className,
}: {
  icon: string;
  count: number;
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
      {count} {label}
    </span>
  );
}

/** Chips de satisfacción de un conjunto de valoraciones. */
function SatisfactionChips({ breakdown }: { breakdown: SatisfactionBreakdown }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <BreakdownChip
        icon="fa-thumbs-up"
        count={breakdown.satisfied}
        label="satisfechos"
        className="bg-emerald-50 text-emerald-700"
      />
      {breakdown.neutral > 0 && (
        <BreakdownChip
          icon="fa-face-meh"
          count={breakdown.neutral}
          label="normales"
          className="bg-slate-100 text-slate-600"
        />
      )}
      {breakdown.complaints > 0 && (
        <BreakdownChip
          icon="fa-triangle-exclamation"
          count={breakdown.complaints}
          label="con quejas"
          className="bg-red-50 text-red-700"
        />
      )}
    </span>
  );
}

/** Resumen global del equipo de delivery. */
function TeamSummary({ metrics }: { metrics: MerchantDeliveryMetrics | null }) {
  const overall = metrics?.overall ?? null;
  const level = deriveDeliveryLevel(overall);
  const breakdown = readBreakdown(metrics?.overallBreakdown);

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-gray-500">
          {overall !== null && overall.count > 0
            ? `${overall.count} calificaciones de entrega`
            : 'Sin calificaciones'}
        </span>
        <span
          className={`text-sm font-bold ${LEVEL_COLOR[level]}`}
          data-testid="delivery-overall-summary"
        >
          {overall !== null && overall.count > 0
            ? `${formatAverage(overall.average)} ★ · ${overall.count} calificaciones`
            : 'Sin valoraciones'}
        </span>
      </div>
      {overall !== null && overall.count > 0 && (
        <div className="mt-2">
          <SatisfactionChips breakdown={breakdown} />
        </div>
      )}
      <p
        className={`mt-2 text-xs font-medium ${LEVEL_COLOR[level]}`}
        data-testid="delivery-overall-level"
      >
        {LEVEL_TEXT[level]}
      </p>
    </div>
  );
}

/** Iniciales del repartidor para el avatar. */
function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'R';
}

/** Fila individual de un repartidor con su desglose de satisfacción. */
function DriverRow({
  driverId,
  name,
  email,
  summary,
  breakdown,
}: {
  driverId: string;
  name: string;
  email: string | null;
  summary: RatingSummary;
  breakdown: SatisfactionBreakdown;
}) {
  const hasComplaints = breakdown.complaints > 0;

  return (
    <li
      className={`rounded-lg p-2.5 ${hasComplaints ? 'bg-red-50/60 ring-1 ring-red-100' : ''}`}
      data-testid={`delivery-driver-rating-${driverId}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
          aria-hidden="true"
        >
          {driverInitials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-800">{name}</span>
          {email !== null && email !== '' && (
            <span className="block truncate text-xs text-gray-400">{email}</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-bold text-gray-900">
          {formatStars(summary.average, summary.count)}
          <span className="ml-1 text-xs font-normal text-gray-400">
            ({summary.count} {summary.count === 1 ? 'entrega' : 'entregas'})
          </span>
        </span>
      </div>
      <div className="mt-1.5 pl-10">
        <SatisfactionChips breakdown={breakdown} />
        {hasComplaints && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <i className="fa-solid fa-clock" aria-hidden="true" />
            Requiere atención
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Sección de deliveries del panel del comercio: desglose individual de cada
 * repartidor (nombre/email, estrellas, entregas, clientes satisfechos y
 * quejas por retrasos o mal servicio) más un resumen global del equipo de
 * entrega, para detectar rápidamente repartidores con valoraciones negativas.
 */
export function MerchantDeliveriesCard({
  metrics,
  drivers,
  isLoading,
  error,
}: MerchantDeliveriesCardProps) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
      aria-label="Desempeño del equipo de delivery"
      data-testid="merchant-deliveries-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100"
            aria-hidden="true"
          >
            <i className="fa-solid fa-truck-fast text-lg text-indigo-600" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Deliveries</p>
            <p className="truncate text-xs text-gray-400">
              {drivers.length} {drivers.length === 1 ? 'repartidor' : 'repartidores'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold ${LEVEL_COLOR[deriveDeliveryLevel(metrics?.overall ?? null)]}`}>
          Equipo
        </span>
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
        <div className="mt-4 space-y-3">
          <TeamSummary metrics={metrics} />

          {metrics === null || metrics.drivers.length === 0 ? (
            <p className="text-xs text-gray-500">
              Aún no hay calificaciones de entrega para tu equipo.
            </p>
          ) : (
            <ul className="space-y-2" aria-label="Calificaciones por repartidor">
              {metrics.drivers.map((entry) => {
                const profile = drivers.find((driver) => driver.id === entry.driverId);
                const name = profile?.full_name ?? profile?.email ?? 'Repartidor';
                return (
                  <DriverRow
                    key={entry.driverId}
                    driverId={entry.driverId}
                    name={name}
                    email={profile?.email ?? null}
                    summary={entry.summary}
                    breakdown={readBreakdown(entry.breakdown)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default MerchantDeliveriesCard;
