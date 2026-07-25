'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Phone, Package, User, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface OrderDetail {
  id: string;
  totalPrice: number;
  deliveryAddress: string | null;
  status: string;
  notes: string | null;
  paymentMethod: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string; phone?: string };
  client: { id: string; name: string; phone: string };
  items: Array<{ menuItem: { name: string }; quantity: number; price: number }>;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function shortId(id: string) {
  return '#' + id.slice(-4).toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function RiderActiveOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/rider/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Pedido no encontrado');
        return res.json();
      })
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/rider/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        if (status === 'DELIVERED') {
          setTimeout(() => router.push('/rider/active'), 1500);
        }
      }
    } catch {}
    setUpdating(false);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DELIVERING: 'badge-brand',
      DELIVERED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    const labels: Record<string, string> = {
      DELIVERING: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    };
    return (
      <span className={`${colors[status] || 'badge-neutral'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-brand-500 font-semibold">{error || 'Pedido no encontrado'}</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-500 underline hover:text-brand-600 transition-colors">Volver</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-ink-light hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Volver</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedido {shortId(order.id)}</h1>
          <p className="text-sm text-neutral-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>
        {statusBadge(order.status)}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-soft">
        <h2 className="font-semibold text-ink">Restaurante</h2>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <p className="font-medium text-ink">{order.restaurant.name}</p>
            <p className="text-sm text-neutral-500">{order.restaurant.address}</p>
            {order.restaurant.phone && (
              <p className="text-sm text-neutral-500">{order.restaurant.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-soft">
        <h2 className="font-semibold text-ink">Cliente</h2>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center">
            <User className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <p className="font-medium text-ink">{order.client.name}</p>
            <p className="text-sm text-neutral-500 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {order.client.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-soft">
        <h2 className="font-semibold text-ink">Direccion de entrega</h2>
        <div className="flex items-center gap-2 text-ink-light">
          <MapPin className="h-5 w-5 text-brand-500" />
          <span>{order.deliveryAddress || 'No especificada'}</span>
        </div>
      </div>

      {order.notes && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-5">
          <p className="text-sm font-medium text-warning-800">Notas del pedido</p>
          <p className="text-sm text-warning-700 mt-1">{order.notes}</p>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-soft">
        <h2 className="font-semibold text-ink">Items ({order.items.length})</h2>
        <div className="divide-y divide-neutral-100">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between py-2 text-sm">
              <span className="text-ink-light">
                {item.quantity} x {item.menuItem.name}
              </span>
              <span className="font-medium text-ink">{formatPrice(item.quantity * item.price)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-neutral-200">
          <span className="font-semibold text-ink">Total</span>
          <span className="font-bold text-lg text-ink">{formatPrice(order.totalPrice)}</span>
        </div>
        <div className="flex justify-between text-sm text-neutral-500">
          <span>Metodo de pago</span>
          <span>{order.paymentMethod === 'CASH' ? 'Efectivo' : order.paymentMethod}</span>
        </div>
      </div>

      {order.status === 'DELIVERING' && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus('DELIVERED')}
            disabled={updating}
            className="btn-primary btn-md flex-1"
          >
            <CheckCircle className="h-5 w-5" />
            {updating ? 'Actualizando...' : 'Marcar como Entregado'}
          </button>
          <button
            onClick={() => updateStatus('CANCELLED')}
            disabled={updating}
            className="flex items-center justify-center gap-2 bg-danger-50 text-danger-600 px-4 py-3 rounded-xl font-semibold hover:bg-danger-100 transition disabled:opacity-50"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
