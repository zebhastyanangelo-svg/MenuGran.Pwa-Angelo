'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox } from '@fortawesome/free-solid-svg-icons';

const statusMap: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Cocinando',
  READY: 'Listo',
  DELIVERING: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusStyles: Record<string, string> = {
  Pendiente: 'badge-warning',
  Confirmado: 'bg-brand-50 text-brand-600',
  Cocinando: 'bg-warning-50 text-warning-600',
  Listo: 'bg-success-50 text-success-600',
  'En camino': 'bg-brand-100 text-brand-700',
  Entregado: 'badge-success',
  Cancelado: 'badge-danger',
};

const activeStatuses = ['Pendiente', 'Confirmado', 'Cocinando', 'Listo', 'En camino'];
const historyStatuses = ['Entregado', 'Cancelado'];

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

interface OrderFromApi {
  id: string;
  status: string;
  total: number;
  restaurantName: string;
  items: number;
  createdAt: string;
}

export default function ClientOrdersPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<OrderFromApi[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pullMessage, setPullMessage] = useState('Desliza para actualizar');

  const fetchOrders = async (userId: string) => {
    try {
      const res = await fetch(`/api/orders?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setError('No fue posible cargar tus pedidos. Intenta de nuevo.');
      }
    } catch {
      setError('No fue posible cargar tus pedidos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) fetchOrders(session.user.id);
  }, [session?.user?.id]);

  const visibleOrders = useMemo(() => {
    return orders
      .map((o) => ({ ...o, statusLabel: statusMap[o.status] || o.status }))
      .filter((o) =>
        activeTab === 'activos'
          ? activeStatuses.includes(o.statusLabel)
          : historyStatuses.includes(o.statusLabel)
      );
  }, [orders, activeTab]);

  const handleRefresh = () => {
    if (loading) return;
    if (!session?.user?.id) return;
    setRefreshing(true);
    setPullMessage('Actualizando...');
    fetchOrders(session.user.id).finally(() => {
      setRefreshing(false);
      setPullMessage('Desliza para actualizar');
    });
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
      className="min-h-screen bg-cream-50 px-4 py-6 sm:px-6 md:px-8 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-4 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Mis Pedidos</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Historial y pedidos activos</h1>
          </div>
          <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-ink-light">
            {refreshing ? 'Actualizando...' : pullMessage}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-soft border border-neutral-200">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('activos')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === 'activos'
                ? 'bg-brand-500 text-white shadow-soft'
                : 'bg-neutral-100 text-ink-light hover:bg-neutral-200'
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === 'historial'
                ? 'bg-brand-500 text-white shadow-soft'
                : 'bg-neutral-100 text-ink-light hover:bg-neutral-200'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-danger-600 shadow-soft">
          <p className="text-lg font-semibold">Error al cargar pedidos</p>
          <p className="mt-3 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 btn-primary btn-md"
          >
            Reintentar
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-soft">
          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-2xl bg-brand-50">
            <FontAwesomeIcon icon={faBox} className="text-4xl text-brand-300" />
          </div>
          <h2 className="text-xl font-semibold text-ink">
            {activeTab === 'activos' ? 'No tienes pedidos activos' : 'No hay historial de pedidos'}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-xs mx-auto">
            {activeTab === 'activos'
              ? 'Cuando tengas pedidos en curso los verás aquí.'
              : 'Los pedidos entregados o cancelados aparecerán aquí.'}
          </p>
          <Link
            href="/client"
            className="mt-6 btn-primary btn-md inline-flex"
          >
            Ver restaurantes
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleOrders.map((order) => {
            const initials = order.restaurantName
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return (
              <div key={order.id} className="rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-xl font-bold text-ink-light">
                      {initials}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">{order.restaurantName}</p>
                      <p className="mt-1 text-sm text-neutral-500">{formatDateTime(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-2 text-sm font-semibold ${statusStyles[order.statusLabel]}`}>
                      {order.statusLabel}
                    </span>
                    <span className="text-sm text-neutral-500">{order.items} items</span>
                    <span className="text-sm font-semibold text-ink">{formatTotal(order.total)}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {activeStatuses.includes(order.statusLabel) ? (
                    <Link
                      href={`/client/tracking/${order.id}`}
                      className="btn-secondary btn-sm"
                    >
                      Ver seguimiento
                    </Link>
                  ) : null}
                  {order.statusLabel === 'Entregado' ? (
                    <Link
                      href="/client"
                      className="btn-primary btn-sm"
                    >
                      Volver a pedir
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
