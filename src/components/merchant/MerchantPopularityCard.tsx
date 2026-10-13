import type { RatingSummary } from '../../services/orderRatingService';

export interface MerchantPopularityCardProps {
  summary: RatingSummary | null;
  isLoading: boolean;
  error: string | null;
}

/** Nivel de popularidad derivado del promedio de estrellas. */
export type PopularityLevel = 'sin_valoraciones' | 'mejorable' | 'buena' | 'muy_buena' | 'excelente';

export function derivePopularityLevel(summary: RatingSummary | null): PopularityLevel {
  if (summary === null || summary.count === 0) return 'sin_valoraciones';
  if (summary.average >= 4.5) return 'excelente';
  if (summary.average >= 4) return 'muy_buena';
  if (summary.average >= 3) return 'buena';
  return 'mejorable';
}

interface LevelMeta {
  label: string;
  color: string;
  textColor: string;
  pillClass: string;
  hint: string;
}

const LEVEL_META: Record<PopularityLevel, LevelMeta> = {
  sin_valoraciones: {
    label: 'Sin valoraciones',
    color: '#cbd5e1',
    textColor: 'text-slate-500',
    pillClass: 'bg-slate-100 text-slate-600',
    hint: 'Califica tu primer pedido para empezar',
  },
  mejorable: {
    label: 'Mejorable',
    color: '#ef4444',
    textColor: 'text-red-600',
    pillClass: 'bg-red-50 text-red-700 ring-1 ring-red-100',
    hint: 'Revisa qué falla: los clientes están descontentos',
  },
  buena: {
    label: 'Buena',
    color: '#f59e0b',
    textColor: 'text-amber-600',
    pillClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    hint: 'Vas bien, hay margen para destacar',
  },
  muy_buena: {
    label: 'Muy buena',
    color: '#22c55e',
    textColor: 'text-emerald-600',
    pillClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    hint: 'Tus clientes confían en tu servicio',
  },
  excelente: {
    label: 'Excelente',
    color: '#16a34a',
    textColor: 'text-emerald-700',
    pillClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    hint: '¡Felicidades! Estás entre los favoritos del marketplace',
  },
};

/** Formatea el promedio con un decimal venezolano (4,5). */
function formatAverage(average: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

/** Fila de 5 estrellas: llenas hasta el entero, media si hay resto. */
function StarRow({ average }: { average: number }) {
  const fullStars = Math.floor(average);
  const hasHalf = average - fullStars >= 0.25 && average - fullStars < 0.75;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => {
        const icon =
          star <= fullStars
            ? 'fa-solid fa-star text-amber-400'
            : star === fullStars + 1 && hasHalf
              ? 'fa-solid fa-star-half-stroke text-amber-400'
              : 'fa-solid fa-star text-slate-200';
        return <i key={star} className={icon} />;
      })}
    </span>
  );
}

/** Cabecera premium: icono en círculo tintado + título + insignia de nivel. */
function CardHeader({ label, pillClass }: { label: string; pillClass: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100"
          aria-hidden="true"
        >
          <i className="fa-solid fa-fire text-lg text-brand-red" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Popularidad</p>
          <p className="truncate text-xs text-gray-400">Valoraciones de clientes</p>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass}`}
        data-testid="popularity-level"
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Widget premium de popularidad del comercio: resumen del promedio de
 * estrellas de los clientes con insignia de nivel (Excelente, Buena,
 * Mejorable…), fila de estrellas, barra de progreso y descripción del
 * estado, para que el dueño vea de un vistazo la salud de su negocio.
 */
export function MerchantPopularityCard({ summary, isLoading, error }: MerchantPopularityCardProps) {
  const level = derivePopularityLevel(summary);
  const meta = LEVEL_META[level];
  const hasRatings = summary !== null && summary.count > 0;
  const fillRatio = hasRatings ? summary.average / 5 : 0;
  const filledPercent = Math.max(0, Math.min(1, fillRatio)) * 100;

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
      aria-label="Popularidad del comercio"
      data-testid="merchant-popularity-card"
    >
      <span
        className="mb-4 block h-1 w-full rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
        style={{ color: meta.color }}
        aria-hidden="true"
      />

      <CardHeader label={meta.label} pillClass={meta.pillClass} />

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400" role="status">
          Cargando valoraciones…
        </p>
      ) : error !== null ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-end gap-2" data-testid="popularity-average">
            <span className="text-4xl font-bold leading-none tracking-tight text-gray-900">
              {hasRatings ? formatAverage(summary.average) : '—'}
            </span>
            <span className="pb-0.5 text-sm font-medium text-gray-400">/ 5</span>
            <span className="ml-auto pb-0.5">
              {hasRatings ? <StarRow average={summary.average} /> : null}
            </span>
          </div>

          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={
              hasRatings
                ? `Popularidad: ${formatAverage(summary.average)} de 5 estrellas con ${summary.count} valoraciones`
                : 'Aún sin valoraciones'
            }
            data-testid="popularity-gauge"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${filledPercent}%`,
                background: `linear-gradient(90deg, ${meta.color}b3, ${meta.color})`,
              }}
              data-testid="popularity-gauge-fill"
            />
          </div>

          <p className="mt-2.5 text-xs text-gray-500" data-testid="popularity-count">
            {hasRatings
              ? `${summary.count} ${summary.count === 1 ? 'valoración' : 'valoraciones'} de clientes`
              : meta.hint}
          </p>
        </div>
      )}
    </div>
  );
}
