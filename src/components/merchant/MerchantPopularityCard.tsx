import { Flame, Star } from 'lucide-react';
import type { RatingSummary } from '../../services/orderRatingService';

export interface MerchantPopularityCardProps {
  summary: RatingSummary | null;
  isLoading: boolean;
  error: string | null;
}

/** Radio y geometría del medidor (semicírculo estilo termómetro). */
const GAUGE_RADIUS = 52;
const GAUGE_LENGTH = Math.PI * GAUGE_RADIUS;

/** Nivel de popularidad derivado del promedio de estrellas. */
export type PopularityLevel = 'sin_valoraciones' | 'mejorable' | 'buena' | 'muy_buena' | 'excelente';

export function derivePopularityLevel(summary: RatingSummary | null): PopularityLevel {
  if (summary === null || summary.count === 0) return 'sin_valoraciones';
  if (summary.average >= 4.5) return 'excelente';
  if (summary.average >= 4) return 'muy_buena';
  if (summary.average >= 3) return 'buena';
  return 'mejorable';
}

const LEVEL_META: Record<PopularityLevel, { label: string; color: string; textColor: string }> = {
  sin_valoraciones: { label: 'Sin valoraciones', color: '#cbd5e1', textColor: 'text-slate-500' },
  mejorable: { label: 'Mejorable', color: '#ef4444', textColor: 'text-red-600' },
  buena: { label: 'Buena', color: '#f59e0b', textColor: 'text-amber-600' },
  muy_buena: { label: 'Muy buena', color: '#22c55e', textColor: 'text-emerald-600' },
  excelente: { label: 'Excelente', color: '#16a34a', textColor: 'text-emerald-700' },
};

/** Formatea el promedio con un decimal venezolano (4,5). */
function formatAverage(average: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

/**
 * Medidor visual de popularidad del comercio (estilo termómetro/pastel)
 * basado en las valoraciones de los clientes.
 *
 * El arco semicircular se llena proporcionalmente al promedio de estrellas
 * (0-5) y cambia de color según el nivel, para que el dueño vea de un vistazo
 * cómo perciben los clientes a su negocio.
 */
export function MerchantPopularityCard({ summary, isLoading, error }: MerchantPopularityCardProps) {
  const level = derivePopularityLevel(summary);
  const meta = LEVEL_META[level];
  const fillRatio = summary !== null && summary.count > 0 ? summary.average / 5 : 0;
  const filledLength = Math.max(0, Math.min(1, fillRatio)) * GAUGE_LENGTH;

  return (
    <div
      className="min-w-0 rounded-xl bg-white p-4 shadow-sm"
      aria-label="Popularidad del comercio"
      data-testid="merchant-popularity-card"
    >
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-brand-red" aria-hidden="true" />
        <p className="text-sm text-gray-500">Popularidad</p>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400" role="status">
          Cargando valoraciones…
        </p>
      ) : error !== null ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="mt-2 flex flex-col items-center">
          <svg
            viewBox="0 0 128 70"
            className="w-40 max-w-full"
            role="img"
            aria-label={
              summary !== null && summary.count > 0
                ? `Popularidad: ${formatAverage(summary.average)} de 5 estrellas con ${summary.count} valoraciones`
                : 'Aún sin valoraciones'
            }
            data-testid="popularity-gauge"
          >
            {/* Pista del medidor */}
            <path
              d={`M 12 62 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 116 62`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Arco de valoración */}
            <path
              d={`M 12 62 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 116 62`}
              fill="none"
              stroke={meta.color}
              strokeWidth="10"
              strokeLinecap="round"
              pathLength={GAUGE_LENGTH}
              strokeDasharray={`${filledLength} ${GAUGE_LENGTH}`}
              data-testid="popularity-gauge-fill"
            />
          </svg>

          <div className="-mt-4 flex items-center gap-1" data-testid="popularity-average">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="text-2xl font-bold text-gray-900">
              {summary !== null && summary.count > 0 ? formatAverage(summary.average) : '—'}
            </span>
          </div>

          <p className={`mt-1 text-sm font-semibold ${meta.textColor}`} data-testid="popularity-level">
            {meta.label}
          </p>
          <p className="mt-0.5 text-xs text-gray-500" data-testid="popularity-count">
            {summary !== null && summary.count > 0
              ? `${summary.count} ${summary.count === 1 ? 'valoración' : 'valoraciones'} de clientes`
              : 'Califica tu primer pedido para empezar'}
          </p>
        </div>
      )}
    </div>
  );
}
