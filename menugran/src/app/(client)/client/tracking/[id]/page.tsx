'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMapPin, faStore, faCheckCircle, faBox, faCircleXmark, faTruck } from '@fortawesome/free-solid-svg-icons';

const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];
const statusLabels: Record<string, string> = {
  PENDING: 'Pedido recibido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  DELIVERING: 'En camino',
  DELIVERED: 'Entregado',
};


interface OrderData {
  id: string;
  status: string;
  totalPrice: number;
  deliveryAddress: string | null;
  notes: string | null;
  paymentMethod: string;
  createdAt: string;
  client: { id: string; name: string; phone: string };
  restaurant: { id: string; name: string; address: string; phone: string | null };
  rider: { id: string; name: string; phone: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    menuItem: { id: string; name: string; price: number };
  }>;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

export default function ClientTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setError('Pedido no encontrado');
        }
      } catch {
        setError('Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-neutral-200" />
          <div className="h-40 rounded-xl bg-neutral-200" />
          <div className="h-64 rounded-xl bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-lg font-semibold text-brand-500">{error || 'Pedido no encontrado'}</p>
        <button
          onClick={() => router.push('/client/orders')}
          className="mt-5 btn-primary btn-md"
        >
          Volver a mis pedidos
        </button>
      </div>
    );
  }

  const currentStep = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 animate-fade-in">
      <button
        onClick={() => router.push('/client/orders')}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink-light transition hover:text-ink"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        Mis pedidos
      </button>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-2xl text-brand-500">
            <FontAwesomeIcon icon={faBox} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Pedido #{orderId.slice(-4).toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{order.restaurant.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">{formatDate(order.createdAt)}</p>
          </div>
        </div>
      </div>

      {isCancelled ? (
        <div className="mb-6 rounded-xl border border-danger-200 bg-danger-50 p-6 text-center shadow-soft">
          <div className="text-4xl mb-3 text-danger-500"><FontAwesomeIcon icon={faCircleXmark} /></div>
          <h2 className="text-xl font-semibold text-danger-600">Pedido cancelado</h2>
          <p className="mt-2 text-sm text-danger-500">Este pedido fue cancelado.</p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
          <h2 className="mb-6 text-lg font-semibold text-ink">Estado del pedido</h2>
          <div className="space-y-0">
            {statusOrder.map((s, idx) => {
              const isComplete = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={s} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                        isComplete
                          ? 'bg-brand-500 text-white shadow-soft'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {isComplete ? <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5" /> : idx + 1}
                    </div>
                    {idx < statusOrder.length - 1 && (
                      <div
                        className={`h-10 w-0.5 ${
                          isComplete && idx < currentStep ? 'bg-brand-500' : 'bg-neutral-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className={`pb-8 ${isCurrent ? '' : ''}`}>
                    <p
                      className={`text-sm font-semibold ${
                        isComplete ? 'text-ink' : 'text-neutral-400'
                      }`}
                    >
                      {statusLabels[s]}
                    </p>
                    {isCurrent && (
                      <span className="mt-1 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
                        Actual
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <h2 className="mb-4 text-lg font-semibold text-ink">Restaurante</h2>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
            <FontAwesomeIcon icon={faStore} className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-ink">{order.restaurant.name}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <FontAwesomeIcon icon={faMapPin} className="h-3.5 w-3.5" />
              {order.restaurant.address}
            </p>
            {order.restaurant.phone && (
              <p className="mt-1 text-sm text-neutral-500">{order.restaurant.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <h2 className="mb-4 text-lg font-semibold text-ink">Dirección de entrega</h2>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <FontAwesomeIcon icon={faMapPin} className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-light">
              {order.deliveryAddress || 'No especificada'}
            </p>
          </div>
        </div>
      </div>

      {order.rider && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
          <h2 className="mb-4 text-lg font-semibold text-ink">Repartidor</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-600">
              <FontAwesomeIcon icon={faTruck} className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-ink">{order.rider.name}</p>
              <p className="text-sm text-neutral-500">{order.rider.phone}</p>
            </div>
          </div>
        </div>
      )}

      {order.notes && (
        <div className="mb-6 rounded-xl border border-warning-200 bg-warning-50 p-6 shadow-soft">
          <p className="text-sm font-semibold text-warning-800">Notas del pedido</p>
          <p className="mt-1 text-sm text-warning-700">{order.notes}</p>
        </div>
      )}

      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <h2 className="mb-4 text-lg font-semibold text-ink">Items ({order.items.length})</h2>
        <div className="divide-y divide-neutral-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-ink-light">
                  {item.quantity}
                </div>
                <span className="text-sm text-ink-light">{item.menuItem.name}</span>
              </div>
              <span className="text-sm font-semibold text-ink">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
          <span className="text-base font-semibold text-ink">Total</span>
          <span className="text-xl font-bold text-ink">{formatPrice(order.totalPrice)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Método de pago</span>
          <span>{order.paymentMethod === 'CASH' ? 'Efectivo' : order.paymentMethod}</span>
        </div>
      </div>
    </div>
  );
}
