'use client';

import { useEffect, useMemo, useState } from 'react';

const periodOptions = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mes', value: 'mes' },
] as const;

type PeriodValue = (typeof periodOptions)[number]['value'];

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

type AnalyticsData = {
  metrics: { sales: number; orders: number; avgTicket: number; topDish: string };
  salesByDay: { day: string; amount: number }[];
  paymentMethods: { label: string; value: number; count: number; total: number; color: string }[];
  topDishes: { rank: number; name: string; category: string; times: number; total: number }[];
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodValue>('hoy');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const load = useMemo(
    () => (async (selectedPeriod: PeriodValue, signal?: AbortSignal) => {
      const res = await fetch(`/api/admin/analytics?period=${selectedPeriod}`, { signal });
      if (!res.ok) throw new Error('Error al cargar');
      return (await res.json()) as AnalyticsData;
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    load(period, controller.signal)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setError('No se pudo cargar los datos. Intenta de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period, refreshKey, load]);

  const metricCards = useMemo(() => {
    const sales = data?.metrics.sales ?? 0;
    const orders = data?.metrics.orders ?? 0;
    const avgTicket = data?.metrics.avgTicket ?? 0;
    const topDish = data?.metrics.topDish || 'N/A';
    const topDishTimes = data?.topDishes[0]?.times ?? 0;

    return [
      {
        title: period === 'hoy' ? 'Ventas del día' : 'Ventas del período',
        value: sales,
        caption: period === 'hoy' ? 'hoy' : period === 'semana' ? 'últimos 7 días' : 'últimos 30 días',
        icon: '💰',
      },
      {
        title: period === 'hoy' ? 'Pedidos hoy' : 'Pedidos del período',
        value: orders,
        caption: period === 'hoy' ? 'hoy' : period === 'semana' ? 'últimos 7 días' : 'últimos 30 días',
        icon: '🛎️',
      },
      {
        title: 'Ticket promedio',
        value: avgTicket,
        caption: 'por pedido',
        icon: '📈',
      },
      {
        title: 'Plato estrella',
        value: topDish,
        caption: topDishTimes > 0 ? `${topDishTimes} pedidos` : 'sin datos',
        icon: '⭐',
      },
    ];
  }, [data, period]);

  const totalSales = useMemo(
    () => (data?.salesByDay ?? []).reduce((sum, item) => sum + item.amount, 0),
    [data]
  );

  const maxBar = useMemo(
    () => Math.max(1, ...(data?.salesByDay ?? []).map((item) => item.amount)),
    [data]
  );

  const pieGradient = `conic-gradient(${(data?.paymentMethods ?? [])
    .map((item, index) => {
      const methods = data?.paymentMethods ?? [];
      const start = methods.slice(0, index).reduce((sum, current) => sum + current.value, 0);
      const end = start + item.value;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(', ')})`;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Analytics general</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Rendimiento del restaurante</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  option.value === period
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Error de carga</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="btn-primary btn-md mt-4"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.title} className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm shadow-slate-200">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{card.title}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {typeof card.value === 'number' ? formatCurrency(card.value) : card.value}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{card.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {period === 'hoy' ? 'Ventas de hoy' : period === 'semana' ? 'Ventas últimos 7 días' : 'Ventas últimos 30 días'}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(totalSales)}</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {periodOptions.find((o) => o.value === period)?.label}
                </span>
              </div>
              <div className="mt-8 flex items-end gap-4 overflow-x-auto pb-4">
                {(data.salesByDay ?? []).map((bar) => {
                  const height = (bar.amount / maxBar) * 220;
                  return (
                    <div key={bar.day} className="flex flex-col items-center gap-3 text-center">
                      <div
                        role="img"
                        aria-label={`${bar.day}: ${formatCurrency(bar.amount)}`}
                        className="flex w-12 items-end justify-center overflow-hidden rounded-3xl bg-gradient-to-t from-red-600 to-red-400 transition-transform hover:shadow-md"
                        style={{ height: `${height}px` }}
                      />
                      <p className="text-xs font-semibold text-slate-700">{bar.day}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Distribución</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">Métodos de pago</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {periodOptions.find((o) => o.value === period)?.label}
                </span>
              </div>
              <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:items-start">
                <div className="relative h-44 w-44 rounded-full" style={{ background: pieGradient }} />
                <div className="space-y-3">
                  {(data.paymentMethods ?? []).map((method) => (
                    <div key={method.label} className="flex items-center gap-3">
                      <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ backgroundColor: method.color }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{method.label}</p>
                        <p className="text-xs text-slate-500">
                          {method.count}/{method.total} pedidos · {method.value}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Top 5 platos</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Más vendidos</h2>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500">#</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Plato</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Categoría</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Veces pedido</th>
                    <th className="px-4 py-3 font-semibold text-slate-500">Total vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(data.topDishes ?? []).map((dish) => (
                    <tr key={dish.rank} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">{dish.rank}</td>
                      <td className="px-4 py-4 text-slate-900">{dish.name}</td>
                      <td className="px-4 py-4 text-slate-500">{dish.category}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{dish.times}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(dish.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}