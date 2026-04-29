'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const sampleRestaurants = [
  {
    id: '1',
    slug: 'la-parrilla-de-juan',
    name: 'La Parrilla de Juan',
    category: 'Parrilla',
    rating: 4.5,
    deliveryTime: '25-35 min',
    distance: 1.2,
    open: true,
    image: null,
  },
  {
    id: '2',
    slug: 'mama-sabor-italiano',
    name: 'Mama Sabor Italiano',
    category: 'Italiana',
    rating: 4.8,
    deliveryTime: '30-40 min',
    distance: 2.7,
    open: true,
    image: null,
  },
  {
    id: '3',
    slug: 'arepas-de-la-abuelita',
    name: 'Arepas de la Abuelita',
    category: 'Venezolana',
    rating: 4.3,
    deliveryTime: '20-30 min',
    distance: 0.9,
    open: false,
    image: null,
  },
  {
    id: '4',
    slug: 'sushi-maki-house',
    name: 'Sushi Maki House',
    category: 'Japonesa',
    rating: 4.7,
    deliveryTime: '35-45 min',
    distance: 3.4,
    open: true,
    image: null,
  },
  {
    id: '5',
    slug: 'crepes-del-sol',
    name: 'Crepes del Sol',
    category: 'Postres',
    rating: 4.4,
    deliveryTime: '25-35 min',
    distance: 2.1,
    open: true,
    image: null,
  },
  {
    id: '6',
    slug: 'tacos-y-salsa',
    name: 'Tacos y Salsa',
    category: 'Mexicana',
    rating: 4.6,
    deliveryTime: '30-40 min',
    distance: 1.8,
    open: false,
    image: null,
  },
];

const categories = ['Todos', 'Parrilla', 'Italiana', 'Venezolana', 'Japonesa', 'Postres', 'Mexicana'];

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.08) {
        setError('No fue posible cargar los restaurantes. Intenta de nuevo.');
      }
      setLoading(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sampleRestaurants.filter((restaurant) => {
      const matchesCategory = activeCategory === 'Todos' || restaurant.category === activeCategory;
      const matchesSearch =
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 md:px-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Restaurantes cerca de ti</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cali, Colombia</h1>
          </div>
          <div className="w-full max-w-xl">
            <label className="sr-only" htmlFor="restaurant-search">Buscar restaurantes</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">🔎</span>
              <input
                id="restaurant-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar restaurante o tipo de comida"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-12 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex flex-wrap gap-3">
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError('');
              window.location.reload();
            }}
            className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-700">
          <p className="text-xl font-semibold text-slate-900">No hay restaurantes disponibles</p>
          <p className="mt-2 text-sm">Cambia el filtro o intenta otra búsqueda.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/client/r/${restaurant.slug}`}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="h-48 bg-slate-200">
                <div className="flex h-full items-center justify-center text-5xl text-slate-400">
                  🍽️
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{restaurant.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{restaurant.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      restaurant.open ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {restaurant.open ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">{restaurant.deliveryTime}</div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">⭐ {restaurant.rating}</div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">{restaurant.distance} km</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  <p>{restaurant.open ? 'Listo para entrega' : 'No disponible ahora'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
