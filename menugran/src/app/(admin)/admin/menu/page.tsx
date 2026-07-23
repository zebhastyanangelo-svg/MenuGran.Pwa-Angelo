'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

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
  const [dishImageFile, setDishImageFile] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/menu');
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setCategories(data.categories ?? []);
      setDishes(data.dishes ?? []);
    } catch {
      setError('No se pudo cargar los datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    setDishImageFile(null);
    setDishModalOpen(true);
  };

  const resetDishForm = () => {
    setDishName('');
    setDishDescription('');
    setDishPrice('');
    setDishCategoryId(categories[0]?.id ?? '');
    setDishImageFile(null);
    setDishImagePreview('');
  };

  const saveCategory = async () => {
    if (!categoryName.trim() || !categoryOrder.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        action: 'category',
        name: categoryName.trim(),
        order: Number(categoryOrder),
      };
      if (selectedCategory) body.id = selectedCategory.id;

      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const saved = await res.json();

      setCategories((current) => {
        const existing = current.find((item) => item.id === saved.id);
        if (existing) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [...current, saved].sort((a, b) => a.order - b.order);
      });

      setCategoryModalOpen(false);
    } catch {
      setError('Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const saveDish = async () => {
    if (!dishName.trim() || !dishPrice.trim() || !dishCategoryId) return;
    setSaving(true);
    try {
      if (dishImageFile) {
        const formData = new FormData();
        formData.append('action', 'dish');
        formData.append('name', dishName.trim());
        formData.append('description', dishDescription.trim());
        formData.append('price', dishPrice);
        formData.append('categoryId', dishCategoryId);
        formData.append('image', dishImageFile);
        if (selectedDish) formData.append('id', selectedDish.id);

        const res = await fetch('/api/admin/menu', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Error al guardar');
        const saved = await res.json();

        setDishes((current) => {
          const existing = current.find((item) => item.id === saved.id);
          if (existing) {
            return current.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...current];
        });

        setCategories((current) =>
          current.map((item) =>
            item.id === dishCategoryId
              ? { ...item, dishCount: item.dishCount + (selectedDish ? 0 : 1) }
              : item
          )
        );

        setDishModalOpen(false);
        resetDishForm();
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        action: 'dish',
        name: dishName.trim(),
        description: dishDescription.trim(),
        price: Number(dishPrice),
        categoryId: dishCategoryId,
        image: (selectedDish?.image ?? dishImagePreview) || null,
      };
      if (selectedDish) body.id = selectedDish.id;

      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const saved = await res.json();

      setDishes((current) => {
        const existing = current.find((item) => item.id === saved.id);
        if (existing) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...current];
      });

      setCategories((current) =>
        current.map((item) =>
          item.id === dishCategoryId
            ? { ...item, dishCount: item.dishCount + (selectedDish ? 0 : 1) }
            : item
        )
      );

      setDishModalOpen(false);
      resetDishForm();
    } catch {
      setError('Error al guardar el plato');
    } finally {
      setSaving(false);
    }
  };

  const confirmedDelete = (message: string) => window.confirm(message);

  const deleteDish = async (dishId: string) => {
    if (!confirmedDelete('¿Eliminar este plato? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/menu/dishes/${dishId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      const deletedDish = dishes.find((d) => d.id === dishId);
      setDishes((current) => current.filter((dish) => dish.id !== dishId));
      if (deletedDish) {
        setCategories((current) =>
          current.map((item) =>
            item.id === deletedDish.categoryId
              ? { ...item, dishCount: Math.max(0, item.dishCount - 1) }
              : item
          )
        );
      }
    } catch {
      setError('Error al eliminar el plato');
    }
  };

  const toggleAvailability = async (dishId: string) => {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;
    try {
      const res = await fetch(`/api/admin/menu/dishes/${dishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !dish.available }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const updated = await res.json();
      setDishes((current) =>
        current.map((d) => (d.id === dishId ? updated : d))
      );
    } catch {
      setError('Error al cambiar disponibilidad');
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Administración de menú</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Gestión de cocina</h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Organiza categorías, platos y controla la disponibilidad de tu carta desde un solo panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openCategoryModal()}
            className="btn-secondary btn-md"
          >
            Agregar categoría
          </button>
          <button
            type="button"
            onClick={() => openDishModal()}
            className="btn-primary btn-md"
          >
            Agregar plato
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'categories'
                  ? 'bg-brand-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dishes')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'dishes'
                  ? 'bg-brand-500 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
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
                className="input md:w-80"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-xl bg-neutral-100 p-6" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-brand-600">
              <p className="font-semibold">Error al cargar</p>
              <p className="mt-2 text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="btn-primary btn-md mt-4"
              >
                Reintentar
              </button>
            </div>
          ) : activeTab === 'categories' ? (
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
                  No hay categorías creadas. Agrega tu primera categoría para comenzar.
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-lg font-semibold text-ink">{category.name}</p>
                        <p className="mt-1 text-sm text-neutral-500">{category.dishCount} platos</p>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        <span className="badge-neutral">
                          Orden {category.order}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCategoryModal(category)}
                          className="btn-ghost btn-sm"
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
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-600">
                  <p className="text-xl font-semibold text-ink">Agrega tu primer plato</p>
                  <p className="mt-2 text-sm">Aún no hay platos que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3 text-left">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Imagen</th>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Nombre</th>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Categoría</th>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Precio</th>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Disponible</th>
                        <th className="px-4 py-3 text-sm font-semibold text-neutral-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDishes.map((dish) => (
                        <tr key={dish.id} className="rounded-xl bg-white shadow-soft">
                          <td className="whitespace-nowrap px-4 py-4 align-middle">
                            <img
                              src={dish.image || 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=80&q=80'}
                              alt={dish.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          </td>
                          <td className="px-4 py-4 align-middle text-sm font-semibold text-ink">
                            {dish.name}
                          </td>
                          <td className="px-4 py-4 align-middle text-sm text-neutral-600">
                            {dish.categoryName}
                          </td>
                          <td className="px-4 py-4 align-middle text-sm text-ink">
                            {formatPrice(dish.price)}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <button
                              type="button"
                              onClick={() => toggleAvailability(dish.id)}
                              className={`relative inline-flex h-8 w-14 items-center rounded-full px-1 transition ${
                                dish.available ? 'bg-success-500' : 'bg-neutral-300'
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
                                className="btn-ghost btn-sm gap-2"
                              >
                                <Pencil size={14} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDish(dish.id)}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-brand-600 transition hover:bg-brand-100"
                              >
                                <Trash2 size={14} />
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">{selectedCategory ? 'Editar' : 'Nueva'} categoría</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{selectedCategory ? selectedCategory.name : 'Agregar categoría'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="text-neutral-400 transition hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-neutral-700">Nombre</label>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ej. Postres"
                className="input"
              />

              <label className="block text-sm font-semibold text-neutral-700">Orden</label>
              <input
                value={categoryOrder}
                onChange={(event) => setCategoryOrder(event.target.value.replace(/\D/g, ''))}
                placeholder="1"
                className="input"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCategory}
                disabled={saving}
                className="btn-primary btn-md"
              >
                {saving ? 'Guardando...' : 'Guardar categoría'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDishModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">{selectedDish ? 'Editar' : 'Nuevo'} plato</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{selectedDish ? selectedDish.name : 'Agregar nuevo plato'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="text-neutral-400 transition hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">Nombre</label>
                <input
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  placeholder="Nombre del plato"
                  className="input"
                />

                <label className="block text-sm font-semibold text-neutral-700">Descripción</label>
                <textarea
                  value={dishDescription}
                  onChange={(event) => setDishDescription(event.target.value)}
                  placeholder="Descripción corta"
                  className="input min-h-[120px]"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-neutral-700">Precio</label>
                <input
                  value={dishPrice}
                  onChange={(event) => setDishPrice(event.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="12500"
                  className="input"
                />

                <label className="block text-sm font-semibold text-neutral-700">Categoría</label>
                <select
                  value={dishCategoryId}
                  onChange={(event) => setDishCategoryId(event.target.value)}
                  className="input"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-neutral-700">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-neutral-600"
                />
                {dishImagePreview ? (
                  <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                    <img src={dishImagePreview} alt="Preview" className="h-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-3 flex h-36 items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-500">
                    Previsualización de imagen
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDishModalOpen(false)}
                className="btn-secondary btn-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveDish}
                disabled={saving}
                className="btn-primary btn-md"
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
