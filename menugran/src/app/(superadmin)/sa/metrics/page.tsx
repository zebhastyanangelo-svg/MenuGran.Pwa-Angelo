'use client';

import { useEffect, useState } from 'react';
import { Download, ChevronUp, BarChart3, CreditCard, Clock, Smile } from 'lucide-react';

interface BusinessComparison {
  name: string;
  orders: number;
  revenue: number;
  rating: number;
  deliveryTime: string;
  complaints: number;
}

interface TopDish {
  name: string;
  sold: number;
  revenue: number;
}

const businesses: string[] = ['Todos', 'La Casa del Sabor', 'Burger Factory', 'Sushi Express', 'Taco Loco'];

const paymentMethods = [
  { label: 'Tarjeta', percent: 56, color: 'bg-red-600' },
  { label: 'Efectivo', percent: 24, color: 'bg-emerald-600' },
  { label: 'Transferencia', percent: 12, color: 'bg-amber-500' },
  { label: 'Otros', percent: 8, color: 'bg-slate-500' },
];

const topDishes: TopDish[] = [
  { name: 'Pizza Margherita', sold: 420, revenue: 5250 },
  { name: 'Burger Doble', sold: 390, revenue: 4680 },
  { name: 'Combo Sushi 12', sold: 330, revenue: 6600 },
  { name: 'Tacos al Pastor', sold: 290, revenue: 3480 },
  { name: 'Ensalada César', sold: 260, revenue: 2340 },
];

const comparisonRows: BusinessComparison[] = [
  { name: 'La Casa del Sabor', orders: 128, revenue: 14520, rating: 4.9, deliveryTime: '24 min', complaints: 3 },
  { name: 'Burger Factory', orders: 112, revenue: 13240, rating: 4.8, deliveryTime: '22 min', complaints: 2 },
  { name: 'Sushi Express', orders: 98, revenue: 12410, rating: 4.9, deliveryTime: '28 min', complaints: 1 },
  { name: 'Taco Loco', orders: 84, revenue: 9800, rating: 4.7, deliveryTime: '27 min', complaints: 4 },
  { name: 'Pasta Studio', orders: 76, revenue: 8600, rating: 4.6, deliveryTime: '25 min', complaints: 2 },
];

const dailyOrders = [
  { day: '1', value: 240 },
  { day: '2', value: 280 },
  { day: '3', value: 310 },
  { day: '4', value: 290 },
  { day: '5', value: 340 },
  { day: '6', value: 360 },
  { day: '7', value: 400 },
  { day: '8', value: 420 },
  { day: '9', value: 390 },
  { day: '10', value: 450 },
  { day: '11', value: 470 },
  { day: '12', value: 490 },
  { day: '13', value: 520 },
  { day: '14', value: 560 },
];

export default function SuperAdminMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState('Todos');
  const [selectedRange, setSelectedRange] = useState('Últimos 30 días');

  useEffect(() => {
    const load = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 900));
      } catch (err) {
        setError('No se pudieron cargar las métricas. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-40 rounded-3xl bg-slate-200" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="h-72 rounded-3xl bg-slate-200" />
              <div className="space-y-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="h-20 rounded-3xl bg-slate-200" />
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
      <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-8">
        <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm text-center">
          <p className="text-red-600 text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Métricas globales</p>
            <h1 className="text-3xl font-semibold text-slate-950">Rendimiento de la plataforma</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm"
            >
              {businesses.map((business) => (
                <option key={business} value={business}>{business}</option>
              ))}
            </select>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm"
            >
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
              <option>Último trimestre</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar Reporte
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Total pedidos</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">8.520</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-emerald-700">+12.4% vs mes anterior</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Ticket promedio global</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">$23.80</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-emerald-700">+6.8% vs mes anterior</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Tiempo promedio de entrega</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">26 min</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-800">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-emerald-700">-3.2% vs mes anterior</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Satisfacción</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">94%</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
                <Smile className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-emerald-700">+2.9% vs mes anterior</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr] mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Pedidos por día</h2>
                <p className="text-sm text-slate-500">Últimos 14 días</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <ChevronUp className="h-4 w-4 text-emerald-600" />
                Tendencia positiva
              </div>
            </div>
            <div className="flex items-end gap-3 overflow-x-auto pb-4">
              {dailyOrders.map((entry) => {
                const height = Math.max(24, (entry.value / 560) * 160);
                return (
                  <div key={entry.day} className="flex-1 min-w-[44px] text-center">
                    <div className="mx-auto mb-2 h-[160px] w-full rounded-3xl bg-slate-200">
                      <div style={{ height }} className="rounded-3xl bg-red-600 transition-all" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{entry.value}</p>
                    <p className="text-xs text-slate-500">{entry.day}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-950">Métodos de pago</h2>
              <p className="text-sm text-slate-500">Distribución global</p>
            </div>
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{method.label}</p>
                      <p className="text-sm text-slate-500">{method.percent}%</p>
                    </div>
                    <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-950">{method.percent}%</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className={`${method.color} h-2 rounded-full`} style={{ width: `${method.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950 mb-4">Top 5 platos más vendidos</h2>
            <div className="space-y-4">
              {topDishes.map((dish, index) => (
                <div key={dish.name} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{index + 1}. {dish.name}</p>
                    <p className="text-sm text-slate-500">Vendidos: {dish.sold}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">${dish.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950 mb-4">Tendencias</h2>
            <div className="space-y-4">
              <div className="rounded-3xl bg-red-50 p-4">
                <p className="text-sm text-slate-500">Mayor crecimiento</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">La Casa del Sabor</p>
                <p className="mt-1 text-sm text-slate-600">+18.2% en pedidos</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Más quejas</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Taco Loco</p>
                <p className="mt-1 text-sm text-slate-600">4.5% de quejas esta semana</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Comparativa de negocios</h2>
              <p className="text-sm text-slate-500">Estado actual por negocio</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-6">Negocio</th>
                  <th className="py-3 pr-6">Pedidos</th>
                  <th className="py-3 pr-6">Ingresos</th>
                  <th className="py-3 pr-6">Rating</th>
                  <th className="py-3 pr-6">Tiempo entrega</th>
                  <th className="py-3">Quejas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {comparisonRows.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pr-6 font-medium text-slate-900">{row.name}</td>
                    <td className="py-4 pr-6">{row.orders}</td>
                    <td className="py-4 pr-6">${row.revenue.toLocaleString()}</td>
                    <td className="py-4 pr-6">{row.rating.toFixed(1)}</td>
                    <td className="py-4 pr-6">{row.deliveryTime}</td>
                    <td className="py-4">{row.complaints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
