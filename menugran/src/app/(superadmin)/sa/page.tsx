'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Briefcase, Users, ShoppingBag, Wallet, Bell, TrendingUp } from 'lucide-react';

interface BusinessRank {
  id: number;
  name: string;
  owner: string;
  orders: number;
  revenue: number;
  rating: number;
}

interface RecentOrder {
  id: string;
  business: string;
  amount: number;
  time: string;
}

interface RecentBusiness {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
}

const metricCards = [
  {
    label: 'Negocios activos',
    value: '128',
    trend: '+8.3%',
    icon: Briefcase,
    color: 'bg-slate-100 text-slate-900',
  },
  {
    label: 'Usuarios registrados',
    value: '9.4K',
    trend: '+5.9%',
    icon: Users,
    color: 'bg-slate-100 text-slate-900',
  },
  {
    label: 'Pedidos del día',
    value: '4,720',
    trend: '+12.7%',
    icon: ShoppingBag,
    color: 'bg-slate-100 text-slate-900',
  },
  {
    label: 'Ingresos del día',
    value: '$52.4K',
    trend: '+14.2%',
    icon: Wallet,
    color: 'bg-slate-100 text-slate-900',
  },
];

const topBusinesses: BusinessRank[] = [
  { id: 1, name: 'La Casa del Sabor', owner: 'María García', orders: 128, revenue: 14520, rating: 4.9 },
  { id: 2, name: 'Burger Factory', owner: 'Luis Fernández', orders: 112, revenue: 13240, rating: 4.8 },
  { id: 3, name: 'Sushi Express', owner: 'Laura Torres', orders: 98, revenue: 12410, rating: 4.9 },
  { id: 4, name: 'Taco Loco', owner: 'Juan Pérez', orders: 84, revenue: 9800, rating: 4.7 },
  { id: 5, name: 'Pasta Studio', owner: 'Ana López', orders: 76, revenue: 8600, rating: 4.6 },
  { id: 6, name: 'Parrilla 24/7', owner: 'Carlos Ruiz', orders: 68, revenue: 7800, rating: 4.7 },
  { id: 7, name: 'Healthy Bites', owner: 'Sofía Ramírez', orders: 64, revenue: 7200, rating: 4.8 },
  { id: 8, name: 'Urban Pizza', owner: 'Pedro Martínez', orders: 58, revenue: 6900, rating: 4.6 },
  { id: 9, name: 'Café Central', owner: 'Lucía Castro', orders: 52, revenue: 6400, rating: 4.7 },
  { id: 10, name: 'Noodle Lab', owner: 'Gabriela Moreno', orders: 48, revenue: 6000, rating: 4.5 },
];

const dailyRevenue = [
  { day: 'Lun', amount: 36000 },
  { day: 'Mar', amount: 41000 },
  { day: 'Mie', amount: 47000 },
  { day: 'Jue', amount: 52000 },
  { day: 'Vie', amount: 56000 },
  { day: 'Sab', amount: 61000 },
  { day: 'Dom', amount: 58000 },
];

const recentOrders: RecentOrder[] = [
  { id: 'P-4721', business: 'Sushi Express', amount: 34.20, time: '09:18' },
  { id: 'P-4718', business: 'La Casa del Sabor', amount: 28.50, time: '09:13' },
  { id: 'P-4715', business: 'Burger Factory', amount: 19.80, time: '09:07' },
  { id: 'P-4710', business: 'Taco Loco', amount: 24.00, time: '08:55' },
  { id: 'P-4706', business: 'Urban Pizza', amount: 22.40, time: '08:47' },
];

const recentBusinesses: RecentBusiness[] = [
  { id: 'B-121', name: 'Green Bowl', owner: 'Marta Díaz', createdAt: '09:28' },
  { id: 'B-120', name: 'Curry House', owner: 'Daniel Serrano', createdAt: '09:14' },
  { id: 'B-119', name: 'Bistro Azul', owner: 'Elena Vega', createdAt: '08:58' },
];

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 900));
      } catch (err) {
        setError('No se pudo cargar el dashboard. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/3 rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-32 rounded-3xl bg-slate-200" />
              ))}
            </div>
            <div className="h-96 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6">
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Visión general</p>
          <h1 className="text-3xl font-semibold text-slate-950">Dashboard principal</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'today' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setPeriod('today')}
          >
            Hoy
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'week' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setPeriod('week')}
          >
            Esta semana
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === 'month' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
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
            <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{metric.value}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-emerald-700">
                <ArrowUpRight className="h-4 w-4" />
                <span>{metric.trend} vs mes anterior</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Ventas últimos 7 días</h2>
              <p className="text-sm text-slate-500">Ingresos totales por día</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <TrendingUp className="h-4 w-4" />
              {period === 'today' ? 'Últimas 24h' : period === 'week' ? 'Última semana' : 'Último mes'}
            </div>
          </div>
          <div className="space-y-4">
            {dailyRevenue.map((day) => {
              const width = Math.min(100, Math.round((day.amount / 62000) * 100));
              return (
                <div key={day.day} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{day.day}</span>
                    <span>${(day.amount / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-red-600" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Últimos pedidos</p>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span className="font-semibold">{order.id}</span>
                      <span>{order.time}</span>
                    </div>
                    <p className="mt-2 text-base font-medium text-slate-900">{order.business}</p>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <span>Monto</span>
                      <span>${order.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Negocios creados</p>
              <div className="space-y-3">
                {recentBusinesses.map((business) => (
                  <div key={business.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span className="font-semibold">{business.name}</span>
                      <span>{business.createdAt}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Dueño: {business.owner}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Top 10 negocios por ventas</h2>
            <p className="text-sm text-slate-500">Métricas de rendimiento de los mejores negocios</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <Bell className="h-4 w-4" />
            Actualizado en tiempo real
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-6">#</th>
                <th className="py-3 pr-6">Negocio</th>
                <th className="py-3 pr-6">Dueño</th>
                <th className="py-3 pr-6">Pedidos hoy</th>
                <th className="py-3 pr-6">Ingresos hoy</th>
                <th className="py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pr-6 font-semibold text-slate-900">{business.id}</td>
                  <td className="py-4 pr-6 font-medium text-slate-900">{business.name}</td>
                  <td className="py-4 pr-6">{business.owner}</td>
                  <td className="py-4 pr-6">{business.orders}</td>
                  <td className="py-4 pr-6">${business.revenue.toLocaleString()}</td>
                  <td className="py-4">{business.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
