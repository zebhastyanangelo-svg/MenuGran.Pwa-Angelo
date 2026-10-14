import { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useSuperAdminRatings, type RatingsCategoryFilter } from '../../hooks/useSuperAdminRatings';
import {
  RATING_CATEGORY_LABELS,
  type RatingCategory,
} from '../../utils/ratingCategories';

/** Colores estilo trading del desglose de calidad. */
const CATEGORY_STYLES: Record<
  RatingCategory,
  { bar: string; text: string; icon: string }
> = {
  good: { bar: 'bg-emerald-500', text: 'text-emerald-600', icon: 'fa-solid fa-face-smile' },
  normal: { bar: 'bg-amber-400', text: 'text-amber-600', icon: 'fa-solid fa-face-meh' },
  bad: { bar: 'bg-red-500', text: 'text-red-600', icon: 'fa-solid fa-face-frown' },
};

const CATEGORY_FILTERS: { value: RatingsCategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'good', label: 'Buenas (4-5 ★)' },
  { value: 'normal', label: 'Normales (3 ★)' },
  { value: 'bad', label: 'Malas (1-2 ★)' },
];

function formatAverage(average: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

/** Barra de distribución estilo trading: segmentos buena/normal/mala. */
function RatingDistributionBar({
  good,
  normal,
  bad,
  total,
}: {
  good: number;
  normal: number;
  bad: number;
  total: number;
}) {
  const segments: { key: RatingCategory; value: number }[] = [
    { key: 'good', value: good },
    { key: 'normal', value: normal },
    { key: 'bad', value: bad },
  ];

  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
      data-testid="rating-distribution-bar"
      role="img"
      aria-label={`Distribución de votaciones: ${good} buenas, ${normal} normales, ${bad} malas de ${total}`}
    >
      {segments.map((segment) => {
        if (total === 0 || segment.value === 0) return null;
        const percent = (segment.value / total) * 100;
        return (
          <div
            key={segment.key}
            className={CATEGORY_STYLES[segment.key].bar}
            style={{ width: `${percent}%` }}
            title={`${RATING_CATEGORY_LABELS[segment.key]}: ${segment.value} (${Math.round(percent)}%)`}
          />
        );
      })}
    </div>
  );
}

/** Tarjeta métrica con icono, valor grande y tendencia visual. */
function CategoryCard({
  category,
  count,
  total,
}: {
  category: RatingCategory;
  count: number;
  total: number;
}) {
  const style = CATEGORY_STYLES[category];
  const percent = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bar} bg-opacity-10`}>
            <i className={`${style.icon} text-lg ${style.text}`} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {RATING_CATEGORY_LABELS[category]}
            </p>
            <p
              className="text-2xl font-bold text-slate-900"
              data-testid={`ratings-count-${category}`}
            >
              {count}
            </p>
          </div>
        </div>
        <span className={`text-sm font-bold ${style.text}`}>{percent}%</span>
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SuperAdminRatingsPage() {
  const {
    categories,
    averageMerchantStars,
    averagePlatformStars,
    merchants,
    interactions,
    isLoading,
    error,
    categoryFilter,
    setCategoryFilter,
    merchantFilter,
    setMerchantFilter,
    searchQuery,
    setSearchQuery,
  } = useSuperAdminRatings();

  const selectedMerchant = useMemo(
    () =>
      merchantFilter === 'all'
        ? null
        : (merchants.find((m) => m.merchantId === merchantFilter) ?? null),
    [merchantFilter, merchants],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10">
            <i className="fa-solid fa-star-half-stroke text-xl text-brand-red" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Votaciones</h1>
            <p className="text-sm text-gray-500">
              Reputación de la plataforma: valoraciones de comercios, entregas y MenuGran.
            </p>
          </div>
        </header>

        {error !== null && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {isLoading && (
          <p className="text-center text-gray-600" role="status" data-testid="ratings-loading">
            <i className="fa-solid fa-spinner text-base animate-spin inline mr-2" />
            Cargando votaciones...
          </p>
        )}

        {categories !== null && (
          <>
            {/* Resumen gráfico global */}
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Satisfacción global de la plataforma
                  </p>
                  <p className="text-3xl font-extrabold text-slate-900" data-testid="ratings-total">
                    {categories.total}{' '}
                    <span className="text-sm font-medium text-slate-500">valoraciones</span>
                  </p>
                </div>
                <div className="flex gap-4 text-right text-sm">
                  <div>
                    <p className="text-slate-500">Comercios</p>
                    <p className="font-bold text-slate-900" data-testid="ratings-avg-merchant">
                      {formatAverage(averageMerchantStars)} ★
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">MenuGran</p>
                    <p className="font-bold text-slate-900" data-testid="ratings-avg-platform">
                      {formatAverage(averagePlatformStars)} ★
                    </p>
                  </div>
                </div>
              </div>
              <RatingDistributionBar
                good={categories.good}
                normal={categories.normal}
                bad={categories.bad}
                total={categories.total}
              />
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CategoryCard category="good" count={categories.good} total={categories.total} />
              <CategoryCard category="normal" count={categories.normal} total={categories.total} />
              <CategoryCard category="bad" count={categories.bad} total={categories.total} />
            </div>

            {/* Reputación por comercio: peores primero */}
            <Card className="p-4 space-y-3">
              <h2 className="text-base font-bold text-gray-900">Reputación por comercio</h2>
              {merchants.length === 0 ? (
                <p className="text-sm text-gray-500" data-testid="ratings-no-merchants">
                  Aún no hay valoraciones registradas.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100" data-testid="ratings-merchant-list">
                  {merchants.map((merchant) => (
                    <li key={merchant.merchantId} className="py-3">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {merchant.merchantName ?? `Comercio ${merchant.merchantId.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2">
                          {merchant.bad > 0 && (
                            <Badge variant="danger">{merchant.bad} malas</Badge>
                          )}
                          <span className="text-sm font-bold text-slate-900">
                            {formatAverage(merchant.average)} ★
                          </span>
                          <span className="text-xs text-slate-500">({merchant.count})</span>
                        </div>
                      </div>
                      <RatingDistributionBar
                        good={merchant.good}
                        normal={merchant.normal}
                        bad={merchant.bad}
                        total={merchant.count}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Filtros y listado detallado de interacciones */}
            <Card className="p-4 space-y-4">
              <h2 className="text-base font-bold text-gray-900">Interacciones</h2>

              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 text-base -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar por comercio, cliente o comentario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  aria-label="Buscar votaciones"
                  data-testid="ratings-search"
                />
              </div>

              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por categoría">
                {CATEGORY_FILTERS.map((option) => {
                  const isActive = categoryFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setCategoryFilter(option.value)}
                      className={`inline-flex items-center whitespace-nowrap px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        isActive
                          ? 'bg-brand-red text-white border-brand-red'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <label className="sr-only" htmlFor="ratings-merchant-filter">
                Filtrar por comercio
              </label>
              <select
                id="ratings-merchant-filter"
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 sm:max-w-xs"
                data-testid="ratings-merchant-filter"
              >
                <option value="all">Todos los comercios</option>
                {merchants.map((merchant) => (
                  <option key={merchant.merchantId} value={merchant.merchantId}>
                    {merchant.merchantName ?? merchant.merchantId.slice(0, 8)}
                  </option>
                ))}
              </select>

              {selectedMerchant !== null && (
                <div
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"
                  data-testid="ratings-merchant-selected"
                >
                  <span className="font-semibold text-gray-900">
                    {selectedMerchant.merchantName ?? 'Comercio'}
                  </span>
                  <span className="text-slate-600">
                    Promedio {formatAverage(selectedMerchant.average)} ★ · {selectedMerchant.count} valoraciones
                  </span>
                  {selectedMerchant.bad > 0 && (
                    <Badge variant="danger">Requiere revisión</Badge>
                  )}
                </div>
              )}

              {interactions.length === 0 ? (
                <p className="text-sm text-gray-500" data-testid="ratings-no-interactions">
                  No hay valoraciones que coincidan con los filtros.
                </p>
              ) : (
                <ul className="space-y-3" data-testid="ratings-interactions-list">
                  {interactions.map((interaction) => (
                    <li
                      key={interaction.id}
                      className="rounded-xl border border-gray-100 p-3 shadow-sm"
                      data-testid={`rating-interaction-${interaction.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {interaction.merchantName ?? 'Comercio'}
                          </span>
                          <Badge
                            variant={
                              interaction.category === 'good'
                                ? 'success'
                                : interaction.category === 'normal'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {interaction.merchantStars} ★
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDate(interaction.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Cliente:{' '}
                        <span className="font-medium text-slate-800">
                          {interaction.customerName ?? interaction.customerEmail ?? 'Anónimo'}
                        </span>
                        {interaction.customerEmail !== null && (
                          <span className="text-slate-400"> · {interaction.customerEmail}</span>
                        )}
                      </p>
                      {interaction.driverStars !== null && (
                        <p className="text-xs text-slate-500">
                          Repartidor: {interaction.driverStars} ★
                        </p>
                      )}
                      {interaction.comment !== null && interaction.comment.trim() !== '' && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
                          “{interaction.comment}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default SuperAdminRatingsPage;
