'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const sampleOrders = [
  {
    id: '1',
    number: '#001',
    type: 'delivery',
    status: 'pending',
    address: 'Calle 72 #10-34',
    items: 3,
    total: 45000,
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 5 * 60000),
  },
  {
    id: '2',
    number: '#002',
    type: 'local',
    status: 'pending',
    address: 'Mesa 5',
    items: 2,
    total: 32500,
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 12 * 60000),
  },
  {
    id: '3',
    number: '#003',
    type: 'delivery',
    status: 'confirmed',
    address: 'Cra 15 #4-28',
    items: 4,
    total: 78000,
    paymentMethod: 'transfer',
    createdAt: new Date(Date.now() - 18 * 60000),
  },
  {
    id: '4',
    number: '#004',
    type: 'local',
    status: 'cooking',
    address: 'Mesa 1',
    items: 1,
    total: 15500,
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 9 * 60000),
  },
  {
    id: '5',
    number: '#005',
    type: 'delivery',
    status: 'ready',
    address: 'Av. 68 #12-56',
    items: 5,
    total: 112000,
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 22 * 60000),
  },
  {
    id: '6',
    number: '#006',
    type: 'local',
    status: 'confirmed',
    address: 'Mesa 3',
    items: 3,
    total: 47500,
    paymentMethod: 'transfer',
    createdAt: new Date(Date.now() - 7 * 60000),
  },
  {
    id: '7',
    number: '#007',
    type: 'delivery',
    status: 'cooking',
    address: 'Calle 10 #8-11',
    items: 2,
    total: 36500,
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 11 * 60000),
  },
  {
    id: '8',
    number: '#008',
    type: 'delivery',
    status: 'pending',
    address: 'Cra 7 #45-18',
    items: 6,
    total: 128000,
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 3 * 60000),
  },
  {
    id: '9',
    number: '#009',
    type: 'local',
    status: 'ready',
    address: 'Mesa 9',
    items: 2,
    total: 19800,
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 16 * 60000),
  },
];

const statusConfig = [
  { key: 'pending', label: 'Pendientes', color: 'bg-yellow-100 text-yellow-800', buttonLabel: 'Confirmar' },
  { key: 'confirmed', label: 'Confirmados', color: 'bg-blue-100 text-blue-800', buttonLabel: 'Cocinar' },
  { key: 'cooking', label: 'Cocinando', color: 'bg-orange-100 text-orange-800', buttonLabel: 'Listo' },
  { key: 'ready', label: 'Listos', color: 'bg-emerald-100 text-emerald-800', buttonLabel: 'Asignar' },
] as const;

const filterOptions = ['Todos', 'Delivery', 'Local'] as const;

type FilterOption = (typeof filterOptions)[number];

type OrderType = 'delivery' | 'local';
type OrderStatus = 'pending' | 'confirmed' | 'cooking' | 'ready';

const formatTotal = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const formatTimeAgo = (date: Date) => {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return 'Hace segundos';
  return `Hace ${diff} min`;
};

const getBadge = (method: string) => {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Pago móvil',
    transfer: 'Transferencia',
  };
  return map[method] ?? method;
};

const getNextStatus = (status: OrderStatus): OrderStatus => {
  if (status === 'pending') return 'confirmed';
  if (status === 'confirmed') return 'cooking';
  if (status === 'cooking') return 'ready';
  return 'ready';
};

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
  const [orders, setOrders] = useState(sampleOrders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [activeColumn, setActiveColumn] = useState<OrderStatus>('pending');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.06) {
        setError('No se pudo cargar los pedidos. Intenta nuevamente.');
      }
      setLoading(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setOrders((current) => {
        const nextId = current.length + 1 + Math.floor(Math.random() * 20);
        const newOrder = {
          id: String(nextId),
          number: `#00${nextId}`,
          type: Math.random() > 0.5 ? 'delivery' : ('local' as OrderType),
          status: 'pending' as OrderStatus,
          address: Math.random() > 0.5 ? 'Cra 14 #20-10' : `Mesa ${Math.ceil(Math.random() * 10)}`,
          items: Math.ceil(Math.random() * 5),
          total: 25000 + Math.ceil(Math.random() * 6) * 5000,
          paymentMethod: ['cash', 'card', 'transfer'][Math.floor(Math.random() * 3)],
          createdAt: new Date(),
        };
        return [newOrder, ...current];
      });
      playNotificationSound();
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const matcher = activeFilter === 'Todos'
      ? () => true
      : activeFilter === 'Delivery'
      ? (order: typeof sampleOrders[number]) => order.type === 'delivery'
      : (order: typeof sampleOrders[number]) => order.type === 'local';
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

  const moveToNext = (id: string) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? { ...order, status: getNextStatus(order.status as OrderStatus) }
          : order
      )
    );
  };

  const renderCard = (order: typeof sampleOrders[number]) => {
    const timeAgo = formatTimeAgo(order.createdAt);
    const isLate = order.status === 'pending' && (Date.now() - order.createdAt.getTime()) / 60000 > 15;
    return (
      <Link
        key={order.id}
        href={`/operator/orders/${order.id}`}
        className="group block rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-slate-900">{order.number}</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {order.type === 'delivery' ? '🏠 Delivery' : '🍽️ Local'}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500">{order.type === 'delivery' ? order.address : order.address}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
          <span className={isLate ? 'text-red-600 font-semibold' : ''}>{timeAgo}</span>
          <span>{order.items} items</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-slate-900">{formatTotal(order.total)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <span>→</span>
          {statusConfig.find((status) => status.key === order.status)?.buttonLabel ?? 'Siguiente'}
        </button>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
          <div className="h-8 w-48 rounded-full bg-slate-200 animate-pulse" />
          <div className="mt-4 flex gap-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-10 w-28 rounded-full bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, columnIndex) => (
            <div key={columnIndex} className="space-y-4 rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-36 rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 md:px-8">
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Pedidos operativos</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Vista Kanban</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === option
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

      <div className="mb-6 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm shadow-slate-200 md:hidden">
        <div className="flex min-w-max gap-3">
          {statusConfig.map((column) => (
            <button
              key={column.key}
              type="button"
              onClick={() => setActiveColumn(column.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeColumn === column.key
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {column.label} ({counts[column.key]})
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600 shadow-sm shadow-slate-200">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-4xl">🎉</div>
          <h2 className="text-xl font-semibold text-slate-900">No hay pedidos pendientes</h2>
          <p className="mt-2 text-sm">Todo está al día por ahora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden md:grid md:grid-cols-4 md:gap-4">
            {columns.map((column) => (
              <div key={column.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{column.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{counts[column.key]}</p>
                  </div>
                  <span className={`${column.color} rounded-full px-3 py-1 text-xs font-semibold`}>{counts[column.key]}</span>
                </div>
                <div className="space-y-4">
                  {column.items.length === 0 ? (
                    <div className="rounded-3xl bg-white p-4 text-center text-sm text-slate-500">Sin pedidos</div>
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
                <div key={column.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{column.label}</p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">{counts[column.key]}</p>
                    </div>
                    <span className={`${column.color} rounded-full px-3 py-1 text-xs font-semibold`}>{counts[column.key]}</span>
                  </div>
                  <div className="space-y-4">
                    {column.items.length === 0 ? (
                      <div className="rounded-3xl bg-white p-4 text-center text-sm text-slate-500">Sin pedidos</div>
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
