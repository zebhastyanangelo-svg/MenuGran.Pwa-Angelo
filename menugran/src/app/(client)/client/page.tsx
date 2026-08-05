'use client';

import { useState, useEffect } from 'react';
import { UtensilsCrossed, SearchX } from 'lucide-react';
import BentoCard from '@/components/ui/BentoCard';
import { useFilterStore } from '@/modules/filter';

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
  const category = useFilterStore((state) => state.category);
  const setCategory = useFilterStore((state) => state.setCategory);

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
      <div className="space-y-6">
        <div>
          <p className="section-eyebrow mb-2">Restaurantes cerca de ti</p>
          <h2 className="editorial-h2">Descubre tu próximo plato favorito</h2>
        </div>
        <div className="bento-grid">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`bento-card ${i < 2 ? 'bento-span-2 bento-row-2' : ''} animate-pulse`}
            >
              <div className="h-full bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <SearchX className="h-16 w-16 text-neutral-300" />
        <h2 className="editorial-h2">Error</h2>
        <p className="editorial-body">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary btn-md"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const visibleRestaurants = category
    ? restaurants.filter((restaurant) =>
        restaurant.categories.some((cat) => cat.name === category)
      )
    : restaurants;

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <UtensilsCrossed className="h-16 w-16 text-neutral-300" />
        <h2 className="editorial-h2">No hay restaurantes</h2>
        <p className="editorial-body">Vuelve pronto, estamos agregando nuevos restaurantes.</p>
      </div>
    );
  }

  if (visibleRestaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <SearchX className="h-16 w-16 text-neutral-300" />
        <h2 className="editorial-h2">Sin resultados</h2>
        <p className="editorial-body">
          No hay restaurantes en la categoría &quot;{category}&quot;.
        </p>
        <button onClick={() => setCategory(null)} className="btn-primary btn-md">
          Ver todos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editorial header (spec: Editorial Typography) */}
      <div>
        <p className="section-eyebrow mb-2">Restaurantes cerca de ti</p>
        <h2 className="editorial-h2">Descubre tu próximo plato favorito</h2>
      </div>

      {/* Bento Grid (spec: Bento Grid Layout) */}
      <div className="bento-grid">
        {visibleRestaurants.map((restaurant, index) => {
          const dishCount = restaurant.categories.reduce(
            (total, cat) => total + cat.items.length,
            0
          );
          const primaryCategory = restaurant.categories[0]?.name;

          return (
            <BentoCard
              key={restaurant.id}
              restaurant={{
                id: restaurant.id,
                name: restaurant.name,
                address: restaurant.address,
                dishCount,
                category: primaryCategory,
                featured: index < 2,
                promo: index === 0 ? 'Destacado' : undefined,
                rating: 4.5,
                deliveryMin: 25 + (index % 4) * 5,
              }}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}
