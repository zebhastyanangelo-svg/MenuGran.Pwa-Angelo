'use client';

import { useEffect, useState } from 'react';
import { Store, MapPin, Phone, Building2 } from 'lucide-react';

interface RestaurantData {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  business: { name: string };
}

export default function AdminSettingsPage() {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch('/api/admin/restaurant');
        const data = await res.json();
        if (data.success) {
          setRestaurant(data.data);
        } else {
          setError('No se pudo cargar la información del restaurante');
        }
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-xl bg-neutral-200" />
        <div className="h-40 rounded-xl bg-neutral-200" />
        <div className="h-40 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-brand-500 font-semibold">{error}</p>
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-ink">Configuración</h1>

      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-brand-500">
            <Store className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">{restaurant.name}</h2>
            <p className="text-sm text-neutral-500">Información del restaurante</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-4 rounded-lg bg-neutral-50 p-4">
            <Building2 className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">Negocio</p>
              <p className="text-sm text-neutral-500">{restaurant.business.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg bg-neutral-50 p-4">
            <MapPin className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">Dirección</p>
              <p className="text-sm text-neutral-500">{restaurant.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg bg-neutral-50 p-4">
            <Phone className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">Teléfono</p>
              <p className="text-sm text-neutral-500">{restaurant.phone || 'No registrado'}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg bg-neutral-50 p-4">
            <Store className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">ID del Restaurante</p>
              <p className="text-sm text-neutral-500 font-mono">{restaurant.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-soft">
        <h3 className="mb-4 text-lg font-semibold text-ink">Acerca de</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Panel de administración del restaurante. Desde aquí puedes gestionar el menú,
          ver estadísticas, administrar el personal y configurar tu restaurante.
          Los cambios que realices se verán reflejados en tiempo real para tus clientes.
        </p>
      </div>
    </div>
  );
}
