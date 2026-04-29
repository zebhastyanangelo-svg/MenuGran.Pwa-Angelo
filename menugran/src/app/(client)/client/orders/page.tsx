'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const sampleOrders = [
  {
    id: 'o1',
    restaurant: 'La Parrilla de Juan',
    logo: 'LP',
    status: 'Pendiente',
    datetime: '2026-04-29T12:10:00',
    total: 68500,
    items: 3,
  },
  {
    id: 'o2',
    restaurant: 'Sushi Maki House',
    logo: 'SM',
    status: 'Cocinando',
    datetime: '2026-04-29T11:05:00',
    total: 98200,
    items: 4,
  },
  {
    id: 'o3',
    restaurant: 'Arepas de la Abuelita',
    logo: 'AA',
    status: 'Entregado',
    datetime: '2026-04-28T19:40:00',
    total: 42300,
    items: 2,
  },
  {
    id: 'o4',
    restaurant: 'Tacos y Salsa',
    logo: 'TS',
    status: 'Cancelado',
    datetime: '2026-04-28T17:20:00',
    total: 55700,
    items: 3,
  },
  {
    id: 'o5',
    restaurant: 'Crepes del Sol',
    logo: 'CS',
    status: 'En camino',
    datetime: '2026-04-29T12:45:00',
    total: 38200,
    items: 1,
  },
];

const statusStyles: Record<string, string> = {
  Pendiente: 'bg-yellow-100 text-yellow-800',
  Confirmado: 'bg-blue-100 text-blue-800',
  Cocinando: 'bg-orange-100 text-orange-800',
  'En camino': 'bg-violet-100 text-violet-800',
  Entregado: 'bg-emerald-100 text-emerald-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const formatTotal = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export default function ClientOrdersPage() {
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pullMessage, setPullMessage] = useState('Desliza para actualizar');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.06) {
        setError('No fue posible cargar tus pedidos. Intenta de nuevo.');
      }
      setLoading(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleOrders = useMemo(() => {
    const activeStatuses = ['Pendiente', 'Confirmado', 'Cocinando', 'En camino'];
    const historyStatuses = ['Entregado', 'Cancelado'];
    return sampleOrders.filter((order) =>
      activeTab === 'activos'
        ? activeStatuses.includes(order.status)
        : historyStatuses.includes(order.status)
    );
  }, [activeTab]);

  const handleRefresh = () => {
    if (loading) return;
    setRefreshing(true);
    setPullMessage('Actualizando...');
    setTimeout(() => {
      setRefreshing(false);
      setPullMessage('Desliza para actualizar');
    }, 900);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 10) return;
    setTouchStartY(event.touches[0].clientY);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const currentY = event.touches[0].clientY;
    if (touchStartY === null) return;
    if (currentY - touchStartY > 80) {
      setPullMessage('Suelta para actualizar');
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const currentY = event.changedTouches[0].clientY;
    if (touchStartY === null) return;
    if (currentY - touchStartY > 80) {
      handleRefresh();
    }
    setTouchStartY(null);
    setPullMessage('Desliza para actualizar');
  };

  return (
    <div
      className="min-h-screen bg-[#f9fafb] px-4 py-6 sm:px-6 md:px-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-4 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Mis Pedidos</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Historial y pedidos activos</h1>
          </div>
          <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            {refreshing ? 'Actualizando...' : pullMessage}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('activos')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === 'activos'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === 'historial'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm shadow-red-100">
          <p className="text-lg font-semibold">Error al cargar pedidos</p>
          <p className="mt-3 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-3xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600 shadow-sm shadow-slate-200">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-4xl">📦</div>
          <h2 className="text-xl font-semibold text-slate-900">No tienes pedidos activos</h2>
          <p className="mt-2 text-sm text-slate-500">Cuando tengas pedidos en curso los verás aquí.</p>
          <Link
            href="/client"
            className="mt-6 inline-flex rounded-3xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Ver restaurantes
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleOrders.map((order) => (
            <div key={order.id} className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-xl font-bold text-slate-700">
                    {order.logo}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{order.restaurant}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.datetime)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-2 text-sm font-semibold ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="text-sm text-slate-500">{order.items} items</span>
                  <span className="text-sm font-semibold text-slate-900">{formatTotal(order.total)}</span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {['Pendiente', 'Confirmado', 'Cocinando', 'En camino'].includes(order.status) ? (
                  <Link
                    href={`/client/tracking/${order.id}`}
                    className="rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Ver seguimiento
                  </Link>
                ) : null}
                {order.status === 'Entregado' ? (
                  <button
                    type="button"
                    className="rounded-3xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Volver a pedir
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
