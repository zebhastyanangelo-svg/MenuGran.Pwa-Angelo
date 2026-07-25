'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Phone, Clock, CheckCircle, Package } from 'lucide-react';
import Link from 'next/link';

interface ActiveOrder {
  id: string;
  totalPrice: number;
  deliveryAddress: string | null;
  createdAt: string;
  status: string;
  restaurant: { id: string; name: string; address: string; phone?: string };
  client: { id: string; name: string; phone: string };
  items: Array<{ menuItem: { name: string }; quantity: number; price: number }>;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function shortId(id: string) {
  return '#' + id.slice(-4).toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function ActiveRidersPage() {
  const { data: session } = useSession();
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetch(`/api/rider/orders?riderId=${session.user.id}&status=DELIVERING`)
      .then((res) => res.json())
      .then((data) => {
        setActiveDeliveries(data.orders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const handleComplete = async (orderId: string) => {
    try {
      const res = await fetch(`/api/rider/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      if (res.ok) {
        setActiveDeliveries((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-ink">Entregas Activas</h1>
        <p className="text-neutral-600 mt-2">Gestiona tus entregas en progreso</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : activeDeliveries.length === 0 ? (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-8 text-center">
          <MapPin className="mx-auto mb-4 text-brand-600" size={32} />
          <p className="text-ink-light font-medium">No hay entregas activas</p>
          <p className="text-neutral-500 text-sm mt-2">
            Dirigete a &quot;Disponibles&quot; para buscar entregas
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6 hover:shadow-elevated transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-ink">{shortId(delivery.id)}</span>
                    <span className="text-xs text-neutral-400">{timeAgo(delivery.createdAt)}</span>
                  </div>
                  <h3 className="font-semibold text-ink text-lg">
                    {delivery.client.name}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <Package size={16} />
                      <span>{delivery.restaurant.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>{delivery.deliveryAddress || delivery.restaurant.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      <span>{delivery.client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>Desde hace {timeAgo(delivery.createdAt)}</span>
                    </div>
                    <div className="font-semibold text-ink mt-1">
                      {formatPrice(delivery.totalPrice)}
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <Link
                    href={`/rider/active/${delivery.id}`}
                    className="btn-primary btn-md text-center text-sm"
                  >
                    Ver detalle
                  </Link>
                  <button
                    onClick={() => handleComplete(delivery.id)}
                    className="btn-primary btn-md gap-2"
                  >
                    <CheckCircle size={16} />
                    Completar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
