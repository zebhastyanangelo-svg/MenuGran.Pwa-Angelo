'use client';

import { useEffect, useMemo, useState } from 'react';

type Category = {
  id: string;
  name: string;
  order: number;
  dishCount: number;
};

type Dish = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  available: boolean;
  image: string;
};

const initialCategories: Category[] = [
  { id: 'c1', name: 'Entradas', order: 1, dishCount: 4 },
  { id: 'c2', name: 'Platos Fuertes', order: 2, dishCount: 6 },
  { id: 'c3', name: 'Postres', order: 3, dishCount: 2 },
];

const initialDishes: Dish[] = [
  {
    id: 'd1',
    name: 'Nachos con Queso',
    description: 'Nachos crujientes con queso derretido y jalapeños.',
    categoryId: 'c1',
    categoryName: 'Entradas',
    price: 12500,
    available: true,
    image: 'https://images.unsplash.com/photo-1555992336-03a23c4ca505?auto=format&fit=crop&w=80&q=80',
  },
  {
    id: 'd2',
    name: 'Hamburguesa Clásica',
    description: 'Carne, queso y salsas artesanales en pan brioche.',
    categoryId: 'c2',
    categoryName: 'Platos Fuertes',
    price: 24500,
    available: true,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=80&q=80',
  },
  {
    id: 'd3',
    name: 'Tacos de Pollo',
    description: 'Tacos suaves con pollo marinado y pico de gallo.',
    categoryId: 'c2',
    categoryName: 'Platos Fuertes',
    price: 17500,
    available: false,
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=80&q=80',
  },
];

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'dishes'>('categories');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isDishModalOpen, setDishModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState('');
  const [dishName, setDishName] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Math.random() < 0.08) {
        setError('No se pudo cargar los datos. Intenta de nuevo.');
      } else {
        setCategories(initialCategories);
        setDishes(initialDishes);
      }
      setLoading(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dishes.filter((dish) => dish.name.toLowerCase().includes(query));
  }, [dishes, search]);

  const categoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);

  const openCategoryModal = (category?: Category) => {
    setSelectedCategory(category ?? null);
    setCategoryName(category?.name ?? '');
    setCategoryOrder(category ? String(category.order) : '');
    setCategoryModalOpen(true);
  };

  const openDishModal = (dish?: Dish) => {
    setSelectedDish(dish ?? null);
    setDishName(dish?.name ?? '');
    setDishDescription(dish?.description ?? '');
    setDishPrice(dish ? String(dish.price) : '');
    setDishCategoryId(dish?.categoryId ?? categories[0]?.id ?? '');
    setDishImagePreview(dish?.image ?? '');
    setDishImage(null);
    setDishModalOpen(true);
  };

  const resetDishForm = () => {
    setDishName('');
    setDishDescription('');
    setDishPrice('');
    setDishCategoryId(categories[0]?.id ?? '');
    setDishImage(null);
    setDishImagePreview('');
  };

  const saveCategory = async () => {
    if (!categoryName.trim() || !categoryOrder.trim()) return;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newCategory: Category = {
      id: selectedCategory?.id ?? `c_${Date.now()}`,
      name: categoryName.trim(),
      order: Number(categoryOrder),
      dishCount: selectedCategory?.dishCount ?? 0,
    };

    setCategories((current) => {
      const existing = current.find((item) => item.id === newCategory.id);
      if (existing) {
        return current.map((item) => (item.id === newCategory.id ? newCategory : item));
      }
      return [...current, newCategory].sort((a, b) => a.order - b.order);
    });

    setSaving(false);
    setCategoryModalOpen(false);
  };

  const saveDish = async () => {
    if (!dishName.trim() || !dishPrice.trim() || !dishCategoryId) return;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const category = categories.find((item) => item.id === dishCategoryId);
    const newDish: Dish = {
      id: selectedDish?.id ?? `d_${Date.now()}`,
      name: dishName.trim(),
      categoryId: dishCategoryId,
      categoryName: category?.name ?? 'Sin categoría',
      price: Number(dishPrice),
      available: selectedDish?.available ?? true,
      image:
        dishImagePreview ||
        'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=80&q=80',
    };

    setDishes((current) => {
      const existing = current.find((item) => item.id === newDish.id);
      if (existing) {
        return current.map((item) => (item.id === newDish.id ? newDish : item));
      }
      return [newDish, ...current];
    });

    setCategories((current) =>
      current.map((item) =>
        item.id === dishCategoryId
          ? { ...item, dishCount: item.dishCount + (selectedDish ? 0 : 1) }
          : item
      )
    );

    setSaving(false);
    setDishModalOpen(false);
    resetDishForm();
  };

  const confirmedDelete = (message: string) => window.confirm(message);

  const deleteDish = (dishId: string) => {
    if (!confirmedDelete('¿Eliminar este plato? Esta acción no se puede deshacer.')) {
      return;
    }
    setDishes((current) => current.filter((dish) => dish.id !== dishId));
  };

  const toggleAvailability = (dishId: string) => {
    setDishes((current) =>
      current.map((dish) =>
        dish.id === dishId ? { ...dish, available: !dish.available } : dish
      )
    );
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDishImage(file);
    if (!file) {
      setDishImagePreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDishImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Administración de menú</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Gestión de cocina</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Organiza categorías, platos y controla la disponibilidad de tu carta desde un solo panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openCategoryModal()}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Agregar categoría
          </button>
          <button
            type="button"
            onClick={() => openDishModal()}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Agregar plato
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'categories'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dishes')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'dishes'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Platos
            </button>
          </div>

          {activeTab === 'dishes' ? (
            <div className="flex w-full items-center gap-3 md:w-auto">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar platos por nombre"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 md:w-80"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl bg-slate-100 p-6" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-semibold">Error al cargar</p>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : activeTab === 'categories' ? (
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  No hay categorías creadas. Agrega tu primera categoría para comenzar.
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{category.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{category.dishCount} platos</p>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-700">
                          Orden {category.order}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCategoryModal(category)}
                          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {filteredDishes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
                  <p className="text-xl font-semibold text-slate-900">Agrega tu primer plato 🍽️</p>
                  <p className="mt-2 text-sm">Aún no hay platos que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3 text-left">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Imagen</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Nombre</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Categoría</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Precio</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Disponible</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDishes.map((dish) => (
                        <tr key={dish.id} className="rounded-3xl bg-white shadow-sm">
                          <td className="whitespace-nowrap px-4 py-4 align-middle">
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          </td>
                          <td className="px-4 py-4 align-middle text-sm font-semibold text-slate-900">
                            {dish.name}
                          </td>
                          <td className="px-4 py-4 align-middle text-sm text-slate-600">
                            {dish.categoryName}
                          </td>
                          <td className="px-4 py-4 align-middle text-sm text-slate-900">
                            {formatPrice(dish.price)}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <button
                              type="button"
                              onClick={() => toggleAvailability(dish.id)}
                              className={`relative inline-flex h-8 w-14 items-center rounded-full px-1 transition ${
                                dish.available ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                                  dish.available ? 'translate-x-6' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-4 align-middle text-sm">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openDishModal(dish)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                              >
                                <span>✏️</span>
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDish(dish.id)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100"
                              >
                                <span>🗑️</span>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCategoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{selectedCategory ? 'Editar' : 'Nueva'} categoría</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedCategory ? selectedCategory.name : 'Agregar categoría'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Nombre</label>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ej. Postres"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

              <label className="block text-sm font-semibold text-slate-700">Orden</label>
              <input
                value={categoryOrder}
                onChange={(event) => setCategoryOrder(event.target.value.replace(/\D/g, ''))}
                placeholder="1"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCategory}
                disabled={saving}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {saving ? 'Guardando...' : 'Guardar categoría'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDishModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{selectedDish ? 'Editar' : 'Nuevo'} plato</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedDish ? selectedDish.name : 'Agregar nuevo plato'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  placeholder="Nombre del plato"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />

                <label className="block text-sm font-semibold text-slate-700">Descripción</label>
                <textarea
                  value={dishDescription}
                  onChange={(event) => setDishDescription(event.target.value)}
                  placeholder="Descripción corta"
                  className="min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Precio</label>
                <input
                  value={dishPrice}
                  onChange={(event) => setDishPrice(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="12500"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />

                <label className="block text-sm font-semibold text-slate-700">Categoría</label>
                <select
                  value={dishCategoryId}
                  onChange={(event) => setDishCategoryId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-slate-700">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-600"
                />
                {dishImagePreview ? (
                  <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                    <img src={dishImagePreview} alt="Preview" className="h-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-3 flex h-36 items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-500">
                    Previsualización de imagen
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveDish}
                disabled={saving}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {saving ? 'Guardando...' : selectedDish ? 'Guardar cambios' : 'Guardar plato'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
