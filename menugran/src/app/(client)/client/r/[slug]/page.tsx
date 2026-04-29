'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/modules/cart/store';

const sampleRestaurants = [
  {
    slug: 'la-parrilla-de-juan',
    name: 'La Parrilla de Juan',
    category: 'Parrilla',
    rating: 4.6,
    deliveryTime: '25-35 min',
    distance: 1.2,
    open: true,
    coverImage: 'https://images.unsplash.com/photo-1555992336-03a23c4ca505?auto=format&fit=crop&w=1200&q=80',
    description: 'Carne a la parrilla, buen ambiente y sabores auténticos.',
    menu: [
      {
        id: 'p1',
        name: 'Churrasco a la parrilla',
        description: 'Corte jugoso servido con papas criollas.',
        price: 28500,
        category: 'Platos Fuertes',
        image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 'p2',
        name: 'Arepa de carne desmechada',
        description: 'Arepa rellena con carne suave y queso.',
        price: 14500,
        category: 'Entradas',
        image: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 'p3',
        name: 'Chorizo típico',
        description: 'Chorizo artesanal con salsa chimichurri.',
        price: 12500,
        category: 'Entradas',
        image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=500&q=80',
        available: false,
      },
      {
        id: 'p4',
        name: 'Lomito saltado',
        description: 'Carne con vegetales y papas criollas.',
        price: 22500,
        category: 'Platos Fuertes',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 'p5',
        name: 'Morcilla con cebolla caramelizada',
        description: 'Morcilla tradicional con toque dulce.',
        price: 12500,
        category: 'Entradas',
        image: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 'p6',
        name: 'Postre de tres leches',
        description: 'Suave y cremoso, con fresas frescas.',
        price: 9500,
        category: 'Postres',
        image: 'https://images.unsplash.com/photo-1512058564366-c9e1f318ba54?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
    ],
  },
  {
    slug: 'sushi-maki-house',
    name: 'Sushi Maki House',
    category: 'Japonesa',
    rating: 4.8,
    deliveryTime: '30-40 min',
    distance: 2.9,
    open: true,
    coverImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    description: 'Sushi fresco y rolls creativos preparados al momento.',
    menu: [
      {
        id: 's1',
        name: 'Roll California',
        description: 'Krab, aguacate y pepino con mayonesa japonesa.',
        price: 24500,
        category: 'Platos Fuertes',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 's2',
        name: 'Gyozas de pollo',
        description: 'Crujientes por fuera y jugosas por dentro.',
        price: 12500,
        category: 'Entradas',
        image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 's3',
        name: 'Tempura de camarón',
        description: 'Camarones crujientes con salsa tonkatsu.',
        price: 18500,
        category: 'Platos Fuertes',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=500&q=80',
        available: false,
      },
      {
        id: 's4',
        name: 'Sopa miso',
        description: 'Sopa caliente con tofu y algas wakame.',
        price: 8500,
        category: 'Bebidas',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
      {
        id: 's5',
        name: 'Matcha Latte',
        description: 'Bebida cremosa con té verde japonés.',
        price: 11500,
        category: 'Bebidas',
        image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=500&q=80',
        available: true,
      },
    ],
  },
];

const categories = ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres'];

const formatPrice = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

export default function RestaurantMenuPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('Entradas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [animateId, setAnimateId] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const itemCount = useCartStore((state) => state.itemCount);

  const restaurant = sampleRestaurants.find((item) => item.slug === params.slug);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!restaurant) {
        setError('No se encontró el restaurante.');
      } else if (Math.random() < 0.06) {
        setError('No se pudo cargar el menú. Intenta de nuevo.');
      }
      setLoading(false);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [restaurant]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const menuItems = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.menu.filter((item) => item.category === activeCategory);
  }, [activeCategory, restaurant]);

  const cartMap = useMemo(
    () => new Map(items.map((item) => [item.id, item.quantity])),
    [items]
  );

  const handleAdd = (item: (typeof sampleRestaurants)[0]['menu'][0]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurantId: restaurant?.slug ?? 'unknown',
      image: item.image,
    });
    setAnimateId(item.id);
    setToast('Agregado al carrito');
    setTimeout(() => setAnimateId(null), 200);
  };

  const handleIncrease = (itemId: string) => {
    updateQuantity(itemId, (cartMap.get(itemId) ?? 0) + 1);
  };

  const handleDecrease = (itemId: string) => {
    const current = cartMap.get(itemId) ?? 0;
    if (current > 1) {
      updateQuantity(itemId, current - 1);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
        <div className="h-52 rounded-[32px] bg-slate-200 animate-pulse" />
        <div className="space-y-4">
          <div className="h-6 w-48 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-5 w-32 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-40 rounded-[32px] bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#f9fafb] px-4 py-10 text-center sm:px-6 md:px-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          <h2 className="text-2xl font-semibold">¡Ups!</h2>
          <p className="mt-4 text-sm">{error || 'No fue posible encontrar este restaurante.'}</p>
          <button
            type="button"
            onClick={() => router.push('/client')}
            className="mt-6 rounded-3xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Volver a restaurantes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9fafb] pb-24">
      {toast ? (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-3xl bg-slate-950 px-5 py-3 text-sm text-white shadow-xl shadow-slate-900/10">
          {toast}
        </div>
      ) : null}

      <div className="relative">
        <div className="relative h-52 overflow-hidden rounded-b-[40px] bg-slate-200">
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-slate-900 shadow-sm shadow-slate-900/5 backdrop-blur"
          >
            ←
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <div className="rounded-[32px] bg-white p-6 shadow-sm shadow-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{restaurant.name}</h1>
              <p className="mt-2 text-sm text-slate-500">{restaurant.category} • {restaurant.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rating</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{restaurant.rating.toFixed(1)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Entrega</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{restaurant.deliveryTime}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Distancia</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{restaurant.distance} km</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
          <div className="flex gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {menuItems.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
            <p className="text-xl font-semibold text-slate-900">No hay platos en esta categoría</p>
            <p className="mt-2 text-sm">Prueba otra categoría o vuelve más tarde.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {menuItems.map((item) => {
              const quantity = cartMap.get(item.id) ?? 0;
              return (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm transition duration-200 ${
                    !item.available ? 'opacity-50' : 'hover:-translate-y-1 hover:shadow-lg'
                  } ${animateId === item.id ? 'scale-[1.01] transition-transform duration-150' : ''}`}
                >
                  <div className="h-52 overflow-hidden rounded-t-[32px] bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
                        <p className="mt-2 line-clamp-1 text-sm text-slate-500">{item.description}</p>
                      </div>
                      {!item.available ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Agotado</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-900">{formatPrice(item.price)}</p>
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item.id)}
                            className="h-8 w-8 rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-200"
                          >
                            −
                          </button>
                          <span className="min-w-[1.5rem] text-center font-semibold text-slate-900">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleIncrease(item.id)}
                            className="h-8 w-8 rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-200"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!item.available}
                          onClick={() => handleAdd(item)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-xl shadow-slate-900/5 sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{itemCount} artículos</p>
              <p className="text-lg font-semibold text-slate-900">Total {formatPrice(total)}</p>
            </div>
            <Link
              href="/client/orders"
              className="rounded-3xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Ver pedido
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
