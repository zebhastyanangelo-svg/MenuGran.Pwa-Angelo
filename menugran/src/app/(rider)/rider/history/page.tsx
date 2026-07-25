'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface DeliveryRecord {
  id: string;
  restaurant: string;
  customer: string;
  deliveredAt: string;
  earnings: number;
  date: string;
}

const formatPrice = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function shortId(id: string) {
  return '#' + id.slice(-4).toUpperCase();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function RiderHistoryPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetch(`/api/rider/orders?riderId=${session.user.id}&status=DELIVERED`)
      .then((res) => res.json())
      .then((data) => {
        const mapped: DeliveryRecord[] = (data.orders || []).map((o: any) => ({
          id: o.id,
          restaurant: o.restaurant.name,
          customer: o.client.name,
          deliveredAt: o.updatedAt || o.createdAt,
          earnings: o.totalPrice,
          date: formatDateGroup(o.updatedAt || o.createdAt),
        }));
        setDeliveries(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const totalEarnings = deliveries.reduce((sum, d) => sum + d.earnings, 0);
  const totalDeliveries = deliveries.length;

  const groupedDeliveries = deliveries.reduce<Record<string, DeliveryRecord[]>>((acc, delivery) => {
    if (!acc[delivery.date]) acc[delivery.date] = [];
    acc[delivery.date].push(delivery);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in min-h-screen bg-cream-50 text-ink">
      <div className="px-4 py-5">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Historial</p>
            <h1 className="text-2xl font-semibold text-ink">Mis Entregas</h1>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-xl bg-white p-4 shadow-soft border border-neutral-200">
            <p className="text-sm text-neutral-500">Total entregas</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{totalDeliveries}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-soft border border-neutral-200">
            <p className="text-sm text-neutral-500">Ganancias totales</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{formatPrice(totalEarnings)}</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl bg-white p-8 shadow-soft border border-neutral-200 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto" />
            <p className="mt-4 text-neutral-600">Cargando tu historial...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-xl bg-white p-8 shadow-soft border border-neutral-200 text-center">
            <p className="text-xl font-semibold text-ink">Aun no has hecho entregas</p>
            <p className="mt-2 text-neutral-600">Empieza a aceptar pedidos para ver tu historial aqui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDeliveries).map(([date, items]) => (
              <div key={date} className="space-y-4">
                <div className="text-sm font-semibold text-neutral-600">{date}</div>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white p-4 shadow-soft border border-neutral-200">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-neutral-500">Pedido {shortId(item.id)}</p>
                          <p className="mt-2 text-base font-semibold text-ink">
                            {item.restaurant} &rarr; {item.customer}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-2">
                          <div>
                            <p className="text-sm text-neutral-500">Hora</p>
                            <p className="mt-1 text-ink font-medium">{formatTime(item.deliveredAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Total</p>
                            <p className="mt-1 text-ink font-medium">{formatPrice(item.earnings)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
