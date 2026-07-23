'use client';

import { useEffect, useState } from 'react';
import { Download, BarChart3, CreditCard, Clock, Smile } from 'lucide-react';

const currency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface MetricsData {
  revenueByDay: { day: string; amount: number }[];
  revenueByMonth: { month: string; amount: number }[];
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  paymentMethodDistribution: { method: string; count: number; percent: number }[];
  topRestaurants: { name: string; orders: number; revenue: number }[];
  userCountsByRole: { role: string; count: number }[];
}

export default function SuperAdminMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [selectedRange, setSelectedRange] = useState('Últimos 7 días');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/superadmin/metrics');
        if (!res.ok) throw new Error('Error');
        const json = await res.json();
        setData(json);
      } catch {
        setError('No se pudieron cargar las métricas. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-6 md:px-8">
        <div className="rounded-xl bg-white p-8 shadow-soft">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-neutral-200" />
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-40 rounded-xl bg-neutral-200" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="h-72 rounded-xl bg-neutral-200" />
              <div className="space-y-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="h-20 rounded-xl bg-neutral-200" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-6 md:px-8">
        <div className="rounded-xl border border-brand-200 bg-white p-8 shadow-soft text-center">
          <p className="text-brand-500 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalUsers = data.userCountsByRole.reduce((s, u) => s + u.count, 0);

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 md:px-8 animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Métricas globales</p>
          <h1 className="text-3xl font-semibold text-ink">Rendimiento de la plataforma</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="input"
          >
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Último trimestre</option>
          </select>
          <button
            type="button"
            className="btn-primary btn-md"
          >
            <Download className="h-4 w-4" />
            Exportar Reporte
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Total pedidos</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{data.totalOrders.toLocaleString()}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm text-success-700">Ingresos: {currency(data.totalRevenue)}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Ticket promedio global</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{currency(data.avgTicket)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm text-success-700">Por pedido entregado</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Usuarios registrados</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{totalUsers}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            {data.userCountsByRole.map((u) => `${u.role}: ${u.count}`).join(' | ')}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">Ingresos totales</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{currency(data.totalRevenue)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success-50 text-success-600">
              <Smile className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm text-success-700">Todos los tiempos</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr] mb-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Ingresos por día</h2>
              <p className="text-sm text-neutral-500">Últimos 7 días</p>
            </div>
          </div>
          <div className="space-y-4">
            {data.revenueByDay.map((d) => {
              const maxAmt = Math.max(...data.revenueByDay.map((x) => x.amount), 1);
              const width = (d.amount / maxAmt) * 100;
              return (
                <div key={d.day} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>{d.day}</span>
                    <span>{currency(d.amount)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-neutral-200">
                    <div className="h-3 rounded-full bg-brand-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-ink">Métodos de pago</h2>
            <p className="text-sm text-neutral-500">Distribución global</p>
          </div>
          <div className="space-y-4">
            {data.paymentMethodDistribution.map((method) => (
              <div key={method.method} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{method.method}</p>
                    <p className="text-sm text-neutral-500">{method.percent}%</p>
                  </div>
                  <div className="rounded-full bg-neutral-200 px-3 py-1 text-sm font-semibold text-ink">{method.percent}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-neutral-200">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${method.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] mb-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink mb-4">Top 5 restaurantes por ingresos</h2>
          <div className="space-y-4">
            {data.topRestaurants.map((r, index) => (
              <div key={r.name} className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div>
                  <p className="font-semibold text-ink">{index + 1}. {r.name}</p>
                  <p className="text-sm text-neutral-500">Pedidos: {r.orders}</p>
                </div>
                <p className="text-sm font-semibold text-ink">{currency(r.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink mb-4">Ingresos por mes</h2>
          <div className="space-y-4">
            {data.revenueByMonth.map((m) => {
              const maxAmt = Math.max(...data.revenueByMonth.map((x) => x.amount), 1);
              const width = (m.amount / maxAmt) * 100;
              return (
                <div key={m.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    <span>{m.month}</span>
                    <span>{currency(m.amount)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-neutral-200">
                    <div className="h-3 rounded-full bg-success-600" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Usuarios por rol</h2>
            <p className="text-sm text-neutral-500">Distribución de la plataforma</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.userCountsByRole.map((u) => (
            <div key={u.role} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-ink">{u.role}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{u.count}</p>
              <p className="text-sm text-neutral-500">{totalUsers > 0 ? ((u.count / totalUsers) * 100).toFixed(1) : 0}% del total</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
