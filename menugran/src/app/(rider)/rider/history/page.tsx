'use client';

import { useEffect, useState } from 'react';

interface DeliveryRecord {
  id: string;
  restaurant: string;
  customer: string;
  deliveredAt: string;
  earnings: number;
  distance: string;
  date: string;
}

const sampleDeliveries: DeliveryRecord[] = [
  {
    id: 'R-308',
    restaurant: 'La Casa del Sabor',
    customer: 'María García',
    deliveredAt: '12:18',
    earnings: 6.50,
    distance: '3.8 km',
    date: 'Hoy',
  },
  {
    id: 'R-299',
    restaurant: 'Burger Factory',
    customer: 'Luis Fernández',
    deliveredAt: '10:42',
    earnings: 5.20,
    distance: '2.3 km',
    date: 'Hoy',
  },
  {
    id: 'R-286',
    restaurant: 'Sushi Express',
    customer: 'Laura Torres',
    deliveredAt: '18:05',
    earnings: 8.00,
    distance: '5.4 km',
    date: 'Ayer',
  },
  {
    id: 'R-274',
    restaurant: 'Taco Loco',
    customer: 'Juan Pérez',
    deliveredAt: '14:30',
    earnings: 4.80,
    distance: '3.1 km',
    date: '15 de marzo',
  },
];

const deliverySummary = {
  deliveries: 12,
  earnings: 82.40,
  distance: '46.2 km',
};

export default function RiderHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      await new Promise(resolve => setTimeout(resolve, 900));
      setDeliveries(sampleDeliveries);
      setLoading(false);
    };

    load();
  }, []);

  const groupedDeliveries = deliveries.reduce<Record<string, DeliveryRecord[]>>((acc, delivery) => {
    if (!acc[delivery.date]) acc[delivery.date] = [];
    acc[delivery.date].push(delivery);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-4 py-5">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Historial</p>
            <h1 className="text-2xl font-semibold text-gray-900">Mis Entregas</h1>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Entregas hoy</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{deliverySummary.deliveries}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Ganancias del día</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">${deliverySummary.earnings.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Distancia recorrida</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{deliverySummary.distance}</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
            <p className="mt-4 text-gray-600">Cargando tu historial...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200 text-center">
            <p className="text-xl font-semibold text-gray-900">Aún no has hecho entregas</p>
            <p className="mt-2 text-gray-600">Empieza a aceptar pedidos para ver tu historial aquí.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDeliveries).map(([date, items]) => (
              <div key={date} className="space-y-4">
                <div className="text-sm font-semibold text-gray-600">{date}</div>
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="rounded-3xl bg-white p-4 shadow-sm border border-gray-200">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Pedido {item.id}</p>
                          <p className="mt-2 text-base font-semibold text-gray-900">{item.restaurant} → {item.customer}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3">
                          <div>
                            <p className="text-sm text-gray-500">Hora</p>
                            <p className="mt-1 text-gray-900 font-medium">{item.deliveredAt}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Ganancia</p>
                            <p className="mt-1 text-gray-900 font-medium">${item.earnings.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Distancia</p>
                            <p className="mt-1 text-gray-900 font-medium">{item.distance}</p>
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
