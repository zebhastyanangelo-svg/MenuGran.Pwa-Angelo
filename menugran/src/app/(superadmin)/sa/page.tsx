'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Briefcase, Users, ShoppingBag, Wallet, Bell, TrendingUp } from 'lucide-react';

const currency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface DashboardData {
  totalBusinesses: number;
  totalRestaurants: number;
  totalUsers: number;
  totalOrders: number;
  revenue: number;
  revenueToday: number;
  ordersByStatus: { status: string; count: number }[];
  topBusinesses: { id: string; name: string; owner: string; orders: number; revenue: number; rating: number }[];
  recentOrders: { id: string; business: string; amount: number; time: string }[];
}

interface DailyRevenue {
  day: string;
  amount: number;
}

const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function buildDailyRevenue(): DailyRevenue[] {
  const result: DailyRevenue[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({ day: dayNames[d.getDay()], amount: 0 });
  }
  return result;
}

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/superadmin/dashboard');
        if (!res.ok) throw new Error('Error al cargar datos');
        const json = await res.json();
        setData(json);
      } catch {
        setError('No se pudo cargar el dashboard. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-soft">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-neutral-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-32 rounded-xl bg-neutral-200" />
              ))}
            </div>
            <div className="h-96 rounded-xl bg-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-xl border border-danger-200 bg-white p-8 shadow-soft text-center">
          <p className="text-danger-500 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metricCards = [
    { label: 'Negocios activos', value: data.totalBusinesses.toString(), icon: Briefcase },
    { label: 'Usuarios registrados', value: data.totalUsers.toString(), icon: Users },
    { label: 'Pedidos totales', value: data.totalOrders.toString(), icon: ShoppingBag },
    { label: 'Ingresos hoy', value: currency(data.revenueToday), icon: Wallet },
  ];

  const dailyRevenue = buildDailyRevenue().map((dr) => {
    const dayOrders = data.recentOrders.filter(
      () => true
    );
    return dr;
  });

  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.amount), 1);

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Visión general</p>
          <h1 className="text-3xl font-semibold text-ink">Dashboard principal</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'today' ? 'bg-brand-500 text-white' : 'bg-white text-ink-light border border-neutral-200 hover:bg-neutral-50'}`}
            onClick={() => setPeriod('today')}
          >
            Hoy
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'week' ? 'bg-brand-500 text-white' : 'bg-white text-ink-light border border-neutral-200 hover:bg-neutral-50'}`}
            onClick={() => setPeriod('week')}
          >
            Esta semana
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'month' ? 'bg-brand-500 text-white' : 'bg-white text-ink-light border border-neutral-200 hover:bg-neutral-50'}`}
            onClick={() => setPeriod('month')}
          >
            Este mes
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-success-600">
                <ArrowUpRight className="h-4 w-4" />
                <span>Ingresos totales: {currency(data.revenue)}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Pedidos por estado</h2>
              <p className="text-sm text-neutral-500">Distribución actual</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink-light">
              <TrendingUp className="h-4 w-4" />
              {data.totalOrders} totales
            </div>
          </div>
          <div className="space-y-4">
            {data.ordersByStatus.map((s) => {
              const pct = data.totalOrders > 0 ? (s.count / data.totalOrders) * 100 : 0;
              return (
                <div key={s.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>{s.status}</span>
                    <span>{s.count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-neutral-200">
                    <div className="h-3 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink-light mb-3">Últimos pedidos</p>
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-ink-light">
                      <span className="font-semibold">{order.id}</span>
                      <span>{order.time}</span>
                    </div>
                    <p className="mt-2 text-base font-medium text-ink">{order.business}</p>
                    <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
                      <span>Monto</span>
                      <span>{currency(order.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Top 5 negocios por pedidos</h2>
            <p className="text-sm text-neutral-500">Métricas de rendimiento de los mejores negocios</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink-light">
            <Bell className="h-4 w-4" />
            Actualizado en tiempo real
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-ink-light">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="py-3 pr-6">#</th>
                <th className="py-3 pr-6">Negocio</th>
                <th className="py-3 pr-6">Pedidos</th>
                <th className="py-3 pr-6">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.topBusinesses.map((business, idx) => (
                <tr key={business.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-4 pr-6 font-semibold text-ink">{idx + 1}</td>
                  <td className="py-4 pr-6 font-medium text-ink">{business.name}</td>
                  <td className="py-4 pr-6">{business.orders}</td>
                  <td className="py-4 pr-6">{currency(business.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
