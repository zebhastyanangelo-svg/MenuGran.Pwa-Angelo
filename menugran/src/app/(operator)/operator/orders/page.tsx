'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faUtensils, faMotorcycle } from '@fortawesome/free-solid-svg-icons';

interface Order {
  id: string;
  number: string;
  serviceType: 'MESA' | 'DELIVERY';
  tableNumber: number | null;
  status: string;
  address: string;
  items: number;
  total: number;
  paymentMethod: string;
  clientName: string;
  createdAt: string;
}

type FilterOption = 'Todos' | 'Mesa' | 'Delivery';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY';

const statusConfig = [
  { key: 'PENDING' as OrderStatus, label: 'Pendientes', color: 'badge-warning', buttonLabel: 'Confirmar' },
  { key: 'CONFIRMED' as OrderStatus, label: 'Confirmados', color: 'badge-brand', buttonLabel: 'Cocinar' },
  { key: 'PREPARING' as OrderStatus, label: 'Cocinando', color: 'bg-warning-50 text-warning-600', buttonLabel: 'Listo' },
  { key: 'READY' as OrderStatus, label: 'Listos', color: 'badge-success', buttonLabel: 'Asignar' },
];

const filterOptions: FilterOption[] = ['Todos', 'Mesa', 'Delivery'];

const formatTotal = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const formatTimeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Hace segundos';
  return `Hace ${diff} min`;
};

const getBadge = (method: string) => {
  const map: Record<string, string> = {
    CASH: 'Efectivo',
    PAGO_MOVIL: 'Pago móvil',
    TRANSFERENCIA: 'Transferencia',
    TRANSFER: 'Transferencia',
  };
  return map[method] ?? method;
};

const getNextStatus = (status: string): OrderStatus => {
  if (status === 'PENDING') return 'CONFIRMED';
  if (status === 'CONFIRMED') return 'PREPARING';
  if (status === 'PREPARING') return 'READY';
  return 'READY';
};

const activeStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

const playNotificationSound = () => {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 620;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // silencio si no es posible
  }
};

export default function OperatorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [activeColumn, setActiveColumn] = useState<OrderStatus>('PENDING');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/operator/orders');
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const matcher = activeFilter === 'Todos'
      ? () => true
      : (order: Order) => order.serviceType === activeFilter.toUpperCase();
    return orders.filter(matcher);
  }, [activeFilter, orders]);

  const columns = useMemo(
    () => statusConfig.map((status) => ({
      ...status,
      items: filteredOrders.filter((order) => order.status === status.key),
    })),
    [filteredOrders]
  );

  const counts = useMemo(
    () => columns.reduce((acc, column) => ({ ...acc, [column.key]: column.items.length }), {} as Record<OrderStatus, number>),
    [columns]
  );

  const moveToNext = async (id: string) => {
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    const nextStatus = getNextStatus(current.status);
    try {
      const res = await fetch(`/api/operator/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: nextStatus } : order
        )
      );
    } catch (err) {
      console.error('Error moving order:', err);
    }
  };

  const renderCard = (order: Order) => {
    const timeAgo = formatTimeAgo(order.createdAt);
    const isLate = order.status === 'PENDING' && (Date.now() - new Date(order.createdAt).getTime()) / 60000 > 15;
    const isDelivery = order.serviceType === 'DELIVERY';
    return (
      <Link
        key={order.id}
        href={`/operator/orders/${order.id}`}
        className="group block rounded-xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-ink">{order.number}</p>
          <span className={`${isDelivery ? 'badge-warning' : 'badge-brand'}`}>
            {isDelivery ? (
              <><FontAwesomeIcon icon={faMotorcycle} className="mr-1" /> Delivery</>
            ) : (
              <><FontAwesomeIcon icon={faUtensils} className="mr-1" /> Mesa {order.tableNumber || ''}</>
            )}
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-500">{order.address}</p>
        <p className="mt-1 text-xs text-neutral-400">{order.clientName}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-500">
          <span className={isLate ? 'text-brand-500 font-semibold' : ''}>{timeAgo}</span>
          <span>{order.items} items</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-ink">{formatTotal(order.total)}</span>
          <span className="badge-neutral">
            {getBadge(order.paymentMethod)}
          </span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            moveToNext(order.id);
          }}
          className="btn-primary btn-sm mt-5"
        >
          <span>→</span>
          {statusConfig.find((s) => s.key === order.status)?.buttonLabel ?? 'Siguiente'}
        </button>
      </Link>
    );
  };

  if (loading) {
    return (
    <div className="animate-fade-in min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 md:px-8">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft">
        <div className="h-8 w-48 rounded-full bg-neutral-200 animate-pulse" />
        <div className="mt-4 flex gap-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-10 w-28 rounded-full bg-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, columnIndex) => (
          <div key={columnIndex} className="space-y-4 rounded-xl bg-white p-4 shadow-soft">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-36 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 md:px-8">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Pedidos operativos</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Vista Kanban</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className={`transition ${
                  activeFilter === option
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

      <div className="mb-6 overflow-x-auto rounded-xl bg-white p-4 shadow-soft md:hidden">
        <div className="flex min-w-max gap-3">
          {statusConfig.map((column) => (
            <button
              key={column.key}
              type="button"
              onClick={() => setActiveColumn(column.key)}
               className={`transition ${
                   activeColumn === column.key
                     ? 'btn-primary btn-sm'
                     : 'btn-secondary btn-sm'
                 }`}
            >
              {column.label} ({counts[column.key]})
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.filter((o) => activeStatuses.includes(o.status as OrderStatus)).length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-600 shadow-soft">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-4xl text-brand-500"><FontAwesomeIcon icon={faUtensils} /></div>
          <h2 className="text-xl font-semibold text-ink">No hay pedidos pendientes</h2>
          <p className="mt-2 text-sm">Todo está al día por ahora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden md:grid md:grid-cols-4 md:gap-4">
            {columns.map((column) => (
                <div key={column.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">{column.label}</p>
                    <p className="mt-1 text-3xl font-bold text-ink">{counts[column.key]}</p>
                  </div>
                  <span className={`${column.color} rounded-full px-3 py-1 text-xs font-semibold`}>{counts[column.key]}</span>
                </div>
                <div className="space-y-4">
                  {column.items.length === 0 ? (
                    <div className="rounded-xl bg-white p-4 text-center text-sm text-neutral-500">Sin pedidos</div>
                  ) : (
                    column.items.map((order) => renderCard(order))
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="md:hidden">
            {columns.map((column) =>
              column.key === activeColumn ? (
              <div key={column.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-700">{column.label}</p>
                      <p className="mt-1 text-3xl font-bold text-ink">{counts[column.key]}</p>
                    </div>
                    <span className={`${column.color} rounded-full px-3 py-1 text-xs font-semibold`}>{counts[column.key]}</span>
                  </div>
                  <div className="space-y-4">
                    {column.items.length === 0 ? (
                      <div className="rounded-xl bg-white p-4 text-center text-sm text-neutral-500">Sin pedidos</div>
                    ) : (
                      column.items.map((order) => renderCard(order))
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
