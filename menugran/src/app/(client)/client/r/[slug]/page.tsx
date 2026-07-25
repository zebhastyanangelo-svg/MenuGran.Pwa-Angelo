'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/modules/cart/store';

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
    order: number;
    items: {
      id: string;
      name: string;
      description?: string;
      price: number;
      image?: string;
      available: boolean;
      order: number;
    }[];
  }[];
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

export default function RestaurantMenuPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${params.slug}`);
        const data = await res.json();
        
        if (data.success) {
          setRestaurant(data.data);
          if (data.data.categories.length > 0) {
            setActiveCategory(data.data.categories[0].name);
          }
        } else {
          setError('Restaurante no encontrado');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [params.slug]);

  const categories = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.categories.map(cat => cat.name);
  }, [restaurant]);

  const activeItems = useMemo(() => {
    if (!restaurant) return [];
    const cat = restaurant.categories.find(c => c.name === activeCategory);
    return cat ? cat.items.filter(item => item.available) : [];
  }, [restaurant, activeCategory]);

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurantId: restaurant!.id,
      image: item.image,
    });
    setToast(`${item.name} agregado al carrito`);
    setTimeout(() => setToast(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
          <p className="text-neutral-500">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-ink">Error</h1>
          <p className="text-neutral-500">{error || 'Restaurante no encontrado'}</p>
          <Link href="/client" className="mt-4 inline-block text-brand-500 hover:text-brand-600 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-cream-50 pb-24">
      {toast ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm text-white shadow-popover">
          {toast}
        </div>
      ) : null}

      <div className="relative">
        <div className="relative h-52 overflow-hidden rounded-b-xl bg-neutral-200">
          <img
            src="https://images.unsplash.com/photo-1555992336-03a23c4ca505?auto=format&fit=crop&w=1200&q=80"
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-ink shadow-soft backdrop-blur"
          >
            ←
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <div className="rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-ink">{restaurant.name}</h1>
              <p className="mt-2 text-sm text-neutral-500">{restaurant.address}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl bg-white p-4 shadow-soft border border-neutral-200">
          <div className="flex gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category
                    ? 'bg-brand-500 text-white shadow-soft'
                    : 'bg-neutral-100 text-ink-light hover:bg-neutral-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {activeItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-ink-light">
            <p className="text-xl font-semibold text-ink">No hay platos en esta categoría</p>
            <p className="mt-2 text-sm">Prueba otra categoría o vuelve más tarde.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="h-52 overflow-hidden rounded-t-xl bg-neutral-100">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-ink">{item.name}</h2>
                      <p className="mt-2 line-clamp-1 text-sm text-neutral-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-ink">{formatPrice(item.price)}</p>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(item)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
