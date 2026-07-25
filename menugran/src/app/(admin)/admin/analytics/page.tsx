'use client';

import { useEffect, useMemo, useState } from 'react';

const metricCards = [
  {
    title: 'Ventas del día',
    value: 152500,
    caption: 'vs ayer',
    trend: 12,
    positive: true,
    icon: '💰',
  },
  {
    title: 'Pedidos hoy',
    value: 78,
    caption: 'vs ayer',
    trend: -6,
    positive: false,
    icon: '🛎️',
  },
  {
    title: 'Ticket promedio',
    value: 33500,
    caption: 'por pedido',
    trend: 8,
    positive: true,
    icon: '📈',
  },
  {
    title: 'Plato estrella',
    value: 'Hamburguesa',
    caption: '315 pedidos',
    trend: 18,
    positive: true,
    icon: '⭐',
  },
];

const salesLast7Days = [
  { day: 'Lun', amount: 95000 },
  { day: 'Mar', amount: 115000 },
  { day: 'Mié', amount: 98000 },
  { day: 'Jue', amount: 147000 },
  { day: 'Vie', amount: 175000 },
  { day: 'Sáb', amount: 192000 },
  { day: 'Dom', amount: 132000 },
];

const paymentMethods = [
  { label: 'Tarjeta', value: 48, color: '#dc2626' },
  { label: 'Efectivo', value: 32, color: '#f97316' },
  { label: 'Wallet', value: 20, color: '#64748b' },
];

const topDishes = [
  { rank: 1, name: 'Hamburguesa Clásica', category: 'Platos Fuertes', times: 315, total: 7837500 },
  { rank: 2, name: 'Pizza Pepperoni', category: 'Platos Fuertes', times: 276, total: 6210000 },
  { rank: 3, name: 'Ensalada César', category: 'Entradas', times: 198, total: 3561000 },
  { rank: 4, name: 'Tacos de Pollo', category: 'Platos Fuertes', times: 164, total: 2870000 },
  { rank: 5, name: 'Cheesecake', category: 'Postres', times: 142, total: 2131000 },
];

const periodOptions = ['Hoy', 'Esta semana', 'Este mes'] as const;

type PeriodOption = (typeof periodOptions)[number];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>('Hoy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.08) {
        setError('No se pudo cargar los datos. Intenta de nuevo.');
      }
      setLoading(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, []);

  const totalSales = useMemo(
    () => salesLast7Days.reduce((sum, item) => sum + item.amount, 0),
    []
  );

  const maxBar = useMemo(
    () => Math.max(...salesLast7Days.map((item) => item.amount)),
    []
  );

  const pieGradient = `conic-gradient(${paymentMethods
    .map((item, index) => {
      const start = paymentMethods.slice(0, index).reduce((sum, current) => sum + current.value, 0);
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
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  option === period
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && !error ? (
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
                <div
                  className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                    card.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  <span>{card.positive ? '▲' : '▼'}</span>
                  <span>{Math.abs(card.trend)}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Ventas últimos 7 días</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(totalSales)}</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{period}</span>
              </div>
              <div className="mt-8 flex items-end gap-4 overflow-x-auto pb-4">
                {salesLast7Days.map((bar) => {
                  const height = Math.max(80, (bar.amount / maxBar) * 220);
                  return (
                    <div key={bar.day} className="flex flex-col items-center gap-3 text-center">
                      <div
                        className="flex h-56 w-12 items-end overflow-hidden rounded-3xl bg-gradient-to-t from-red-600 to-red-400 transition-all hover:shadow-md"
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
                <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{period}</span>
              </div>
              <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:items-start">
                <div className="relative h-44 w-44 rounded-full" style={{ background: pieGradient }} />
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.label} className="flex items-center gap-3">
                      <span className="inline-flex h-3.5 w-3.5 rounded-full" style={{ backgroundColor: method.color }} />
                      <p className="text-sm font-semibold text-slate-900">{method.label}</p>
                      <p className="text-sm text-slate-500">{method.value}%</p>
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
              <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Ver todos
              </button>
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
                  {topDishes.map((dish) => (
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
      ) : null}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Error de carga</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError('');
              window.location.reload();
            }}
            className="mt-4 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
