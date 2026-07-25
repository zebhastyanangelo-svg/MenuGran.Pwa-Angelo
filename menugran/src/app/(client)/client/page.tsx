'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFrown, faUtensils, faStar, faLocationDot } from '@fortawesome/free-solid-svg-icons';

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
            <div key={i} className="bg-white rounded-xl p-6 shadow-soft border border-neutral-200">
              <div className="h-6 bg-neutral-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-5">
          <FontAwesomeIcon icon={faFrown} className="text-3xl text-danger-400" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">Error</h2>
        <p className="text-neutral-500 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary btn-md"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="p-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
          <FontAwesomeIcon icon={faUtensils} className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">No hay restaurantes</h2>
        <p className="text-neutral-500">Vuelve pronto, estamos agregando nuevos restaurantes.</p>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-ink mb-6">Restaurantes cerca de ti</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {restaurants.map((restaurant, index) => (
          <Link
            key={restaurant.id}
            href={`/client/r/${restaurant.id}`}
            className="group bg-white rounded-xl shadow-soft hover:shadow-elevated transition-all duration-200 p-6 border border-neutral-200 hover:border-brand-200 hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-ink group-hover:text-brand-500 transition-colors">{restaurant.name}</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-50 text-gold-600 text-xs font-semibold">
                <FontAwesomeIcon icon={faStar} className="w-3 h-3" /> 4.5
              </span>
            </div>
            
            <p className="text-neutral-500 text-sm mb-4 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faLocationDot} className="w-2.5 h-2.5 text-neutral-400" />
              </span>
              {restaurant.address}
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
              <span className="text-xs text-neutral-400 font-medium">
                {restaurant.categories.reduce((total, cat) => total + cat.items.length, 0)} platos
              </span>
              <span className="text-brand-500 text-sm font-semibold group-hover:translate-x-0.5 transition-transform">
                Ver menú →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 