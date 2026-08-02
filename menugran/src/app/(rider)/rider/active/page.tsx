'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Phone, Clock, CheckCircle, Package } from 'lucide-react';
import Link from 'next/link';
import { asAppSession } from '@/lib/session-helpers';

interface ActiveDelivery {
  id: string;
  orderId: string;
  clientName: string;
  clientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedTime: number;
  status: 'DELIVERING' | 'READY_FOR_PICKUP';
}

export default function ActiveRidersPage() {
  const { data: rawSession } = useSession();
  const session = asAppSession(rawSession);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/rider/orders?status=DELIVERING`)
      .then((res) => res.json())
      .then((data) => {
        setActiveDeliveries(data.orders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Entregas Activas</h1>
        <p className="text-gray-600 mt-2">Gestiona tus entregas en progreso</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin">Cargando...</div>
        </div>
      ) : activeDeliveries.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <MapPin className="mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-gray-700 font-medium">No hay entregas activas</p>
          <p className="text-gray-500 text-sm mt-2">
            Dirígete a &quot;Disponibles&quot; para buscar entregas
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {delivery.clientName}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>{delivery.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      <span>{delivery.clientPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>~{delivery.estimatedTime} minutos</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
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
