'use client';

import { useEffect, useMemo, useState } from 'react';

type AnalyticsData = {
  metrics: {
    salesToday: number;
    ordersToday: number;
    avgTicket: number;
    topDish: string;
  };
  salesByDay: { day: string; amount: number }[];
  paymentMethods: { label: string; value: number; color: string }[];
  topDishes: { rank: number; name: string; category: string; times: number; total: number }[];
};

const periodOptions = ['Hoy', 'Esta semana', 'Este mes'] as const;

type PeriodOption = (typeof periodOptions)[number];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const METRIC_ICONS: Record<string, string> = {
  salesToday: '💰',
  ordersToday: '🛎️',
  avgTicket: '📈',
  topDish: '⭐',
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>('Hoy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);

useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Error al cargar');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('No se pudo cargar los datos. Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) throw new Error('Error al cargar');
      const json = await res.json();
      setData(json);
    } catch {
      setError('No se pudo cargar los datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = useMemo(
    () => (data ? data.salesByDay.reduce((sum, item) => sum + item.amount, 0) : 0),
    [data]
  );

  const maxBar = useMemo(
    () => (data ? Math.max(...data.salesByDay.map((item) => item.amount), 1) : 1),
    [data]
  );

  const metricCards = useMemo(() => {
    if (!data) return [];
    return [
      { title: 'Ventas del día', value: data.metrics.salesToday, caption: 'ventas hoy', trend: 0, positive: true, icon: METRIC_ICONS.salesToday, isCurrency: true },
      { title: 'Pedidos hoy', value: data.metrics.ordersToday, caption: 'pedidos hoy', trend: 0, positive: true, icon: METRIC_ICONS.ordersToday, isCurrency: false },
      { title: 'Ticket promedio', value: data.metrics.avgTicket, caption: 'por pedido', trend: 0, positive: true, icon: METRIC_ICONS.avgTicket, isCurrency: true },
      { title: 'Plato estrella', value: data.metrics.topDish, caption: 'más vendido', trend: 0, positive: true, icon: METRIC_ICONS.topDish, isCurrency: false },
    ];
  }, [data]);

  const pieGradient = useMemo(() => {
    if (!data) return '';
    return `conic-gradient(${data.paymentMethods
      .map((item, index) => {
        const start = data.paymentMethods.slice(0, index).reduce((sum, current) => sum + current.value, 0);
        const end = start + item.value;
        return `${item.color} ${start}% ${end}%`;
      })
      .join(', ')})`;
  }, [data]);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Analytics general</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Rendimiento del restaurante</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {periodOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`transition ${
                  option === period
                    ? 'btn-primary btn-sm'
                    : 'btn-secondary btn-sm'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && !error && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.title} className="overflow-hidden rounded-xl bg-white p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-2xl">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-500">{card.title}</p>
                    <p className="mt-3 text-3xl font-semibold text-ink">
                      {card.isCurrency ? formatCurrency(card.value as number) : card.value}
                    </p>
                    <p className="mt-2 text-sm text-neutral-500">{card.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Ventas últimos 7 días</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(totalSales)}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-600">{period}</span>
              </div>
              <div className="mt-8 flex items-end gap-4 overflow-x-auto pb-4">
                {data.salesByDay.map((bar) => {
                  const height = Math.max(80, (bar.amount / maxBar) * 220);
                  return (
                    <div key={bar.day} className="flex flex-col items-center gap-3 text-center">
                      <div
                        className="flex h-56 w-12 items-end overflow-hidden rounded-xl bg-gradient-to-t from-brand-600 to-brand-400 transition-all hover:shadow-elevated"
                        style={{ height: `${height}px` }}
                      />
                      <p className="text-xs font-semibold text-neutral-700">{bar.day}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Distribución</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">Métodos de pago</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700">{period}</span>
              </div>
              <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:items-start">
                {data.paymentMethods.length > 0 ? (
                  <>
                    <div className="relative h-44 w-44 rounded-full" style={{ background: pieGradient }} />
                    <div className="space-y-3">
                      {data.paymentMethods.map((method) => (
                        <div key={method.label} className="flex items-center gap-3">
                          <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ backgroundColor: method.color }} />
                          <p className="text-sm font-semibold text-ink">{method.label}</p>
                          <p className="text-sm text-neutral-500">{method.value}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-neutral-400">Sin datos de pago</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Top 5 platos</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Más vendidos</h2>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-500">#</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Plato</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Categoría</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Veces pedido</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Total vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {data.topDishes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Sin datos de ventas</td>
                    </tr>
                  ) : (
                    data.topDishes.map((dish) => (
                      <tr key={dish.rank} className="hover:bg-neutral-50">
                        <td className="px-4 py-4 font-semibold text-ink">{dish.rank}</td>
                        <td className="px-4 py-4 text-ink">{dish.name}</td>
                        <td className="px-4 py-4 text-neutral-500">{dish.category}</td>
                        <td className="px-4 py-4 font-semibold text-ink">{dish.times}</td>
                        <td className="px-4 py-4 font-semibold text-ink">{formatCurrency(dish.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-brand-600">
          <p className="font-semibold">Error de carga</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="btn-primary btn-md mt-4"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
