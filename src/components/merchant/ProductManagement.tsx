import { useCallback, useEffect, useState } from 'react';
import { supabase, TABLE_NAMES } from '../../services/supabase';
import type { CategoryRow, ProductRow } from '../../types/database';
import { formatPrice } from '../../types/cart';
import { DishFormModal } from './DishFormModal';
import type { ProductFormData } from '../../utils/productForm';

export interface ProductManagementProps {
  merchantId: string;
}

export function ProductManagement({ merchantId }: ProductManagementProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const fetchData = useCallback(async () => {
    if (!merchantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from(TABLE_NAMES.categories)
        .select('*')
        .eq('merchant_id', merchantId)
        .order('sort_order', { ascending: true });

      if (catError) throw catError;
      setCategories(catData ?? []);

      // 2. Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from(TABLE_NAMES.products)
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (prodError) throw prodError;
      setProducts(prodData ?? []);
    } catch (err: unknown) {
      console.error('Error cargando catálogo:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar productos y categorías.'
      );
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Alternar disponibilidad rápida (is_available)
  const handleToggleAvailable = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Actualización optimista en UI
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_available: newStatus } : p))
    );

    try {
      const { error: updateError } = await supabase
        .from(TABLE_NAMES.products)
        .update({ is_available: newStatus })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      console.error('Error al actualizar disponibilidad:', err);
      // Revertir optimismo si falla
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_available: currentStatus } : p))
      );
    }
  };

  // Crear o actualizar producto
  const handleSaveProduct = async (formData: ProductFormData) => {
    if (editingProduct) {
      // Actualización
      const { error: updateError } = await supabase
        .from(TABLE_NAMES.products)
        .update({
          title: formData.title,
          description: formData.description,
          price: formData.price,
          category_id: formData.category_id,
          is_available: formData.is_available,
          image_url: formData.image_url,
        })
        .eq('id', editingProduct.id);

      if (updateError) throw updateError;
    } else {
      // Creación
      const { error: insertError } = await supabase
        .from(TABLE_NAMES.products)
        .insert({
          merchant_id: merchantId,
          category_id: formData.category_id,
          title: formData.title,
          description: formData.description,
          price: formData.price,
          is_available: formData.is_available,
          image_url: formData.image_url,
        });

      if (insertError) throw insertError;
    }

    await fetchData();
  };

  // Eliminar producto
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error: deleteError } = await supabase
        .from(TABLE_NAMES.products)
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;
      await fetchData();
    } catch (err: unknown) {
      console.error('Error al eliminar producto:', err);
      alert('No se pudo eliminar el producto.');
    }
  };

  // Agregar nueva categoría
  const handleAddCategory = async (catName: string): Promise<CategoryRow | null> => {
    try {
      const nextSortOrder = categories.length + 1;
      const { data, error: catInsertError } = await supabase
        .from(TABLE_NAMES.categories)
        .insert({
          merchant_id: merchantId,
          name: catName,
          sort_order: nextSortOrder,
        })
        .select()
        .single();

      if (catInsertError) throw catInsertError;
      await fetchData();
      return data as CategoryRow;
    } catch (err: unknown) {
      console.error('Error al crear categoría:', err);
      alert('Error al crear categoría');
      return null;
    }
  };

  const handleCreateCategoryFromForm = async () => {
    if (!catNameInput.trim()) return;
    setSavingCat(true);
    try {
      await handleAddCategory(catNameInput.trim());
      setCatNameInput('');
      setIsAddCatOpen(false);
    } finally {
      setSavingCat(false);
    }
  };

  // Productos filtrados por categoría y búsqueda
  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      !selectedCategoryId || prod.category_id === selectedCategoryId;
    const matchesSearch =
      !searchTerm.trim() ||
      prod.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.description &&
        prod.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Sin categoría';
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 font-medium">
        Cargando catálogo...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Cabecera y Botones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión del Menú</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Administra tus platillos, precios, imágenes y disponibilidad.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsAddCatOpen(true)}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors"
          >
            + Nueva Categoría
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
          >
            + Nuevo Platillo
          </button>
        </div>
      </div>

      {/* Modal / Formulario rápido para crear categoría */}
      {isAddCatOpen && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-3">
          <label htmlFor="category-name-input" className="text-xs font-semibold text-indigo-900 whitespace-nowrap">
            Nombre de la Categoría:
          </label>
          <input
            id="category-name-input"
            type="text"
            value={catNameInput}
            onChange={(e) => setCatNameInput(e.target.value)}
            placeholder="Ej. Entradas, Postres, Bebidas"
            className="border border-gray-300 rounded px-3 py-1.5 text-xs flex-grow focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCreateCategoryFromForm}
              disabled={savingCat || !catNameInput.trim()}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingCat ? 'Guardando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddCatOpen(false);
                setCatNameInput('');
              }}
              className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros: Categorías y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Chips de Categorías */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategoryId
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Campo de Búsqueda */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista / Grid de Productos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500 text-sm">
          No hay productos en esta categoría o búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className={`bg-white border rounded-lg shadow-sm p-4 flex flex-col justify-between transition-all ${
                !prod.is_available ? 'opacity-60 bg-gray-50' : ''
              }`}
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      className="w-16 h-16 object-cover rounded-md border flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center flex-shrink-0">
                      Sin foto
                    </div>
                  )}

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold uppercase tracking-wider truncate">
                        {getCategoryName(prod.category_id)}
                      </span>
                      <span className="text-sm font-bold text-indigo-700">
                        {formatPrice(prod.price)}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm mt-1 truncate">
                      {prod.title}
                    </h3>

                    {prod.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {prod.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de Card: Controles y Acciones */}
              <div className="border-t pt-3 mt-2 flex items-center justify-between gap-2">
                {/* Switch Toggle Disponibilidad */}
                <button
                  type="button"
                  data-testid={`toggle-available-${prod.id}`}
                  onClick={() => handleToggleAvailable(prod.id, prod.is_available)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    prod.is_available
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  title={
                    prod.is_available
                      ? 'Click para marcar agotado'
                      : 'Click para activar venta'
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prod.is_available ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  {prod.is_available ? 'Disponible' : 'Agotado'}
                </button>

                {/* Acciones Editar y Eliminar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(prod);
                      setIsProductModalOpen(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición de Platillo */}
      <DishFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        categories={categories}
        initialData={editingProduct}
        onAddCategory={handleAddCategory}
      />
    </div>
  );
}
