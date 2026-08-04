'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      price: number;
      available: boolean;
    }[];
  }[];
}

export default function ClientPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch('/api/restaurants');
        const data = await res.json();
        
        if (data.success) {
          setRestaurants(data.data);
        } else {
          setError('No se pudieron cargar los restaurantes');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-6 bg-cream-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-cream-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-cream-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-ink mb-2">Error</h2>
        <p className="text-ink-lighter mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-xl font-bold text-ink mb-2">No hay restaurantes</h2>
        <p className="text-ink-lighter">Vuelve pronto, estamos agregando nuevos restaurantes.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-ink mb-6">Restaurantes cerca de ti</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/client/r/${restaurant.id}`}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-neutral-100"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-ink">{restaurant.name}</h3>
              <span className="text-yellow-500 font-medium">⭐ 4.5</span>
            </div>
            
            <p className="text-ink-lighter text-sm mb-3 flex items-center gap-1">
              <span></span> {restaurant.address}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                {restaurant.categories.reduce((total, cat) => total + cat.items.length, 0)} platos disponibles
              </span>
              <span className="text-brand-600 text-sm font-medium">
                Ver menú →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 