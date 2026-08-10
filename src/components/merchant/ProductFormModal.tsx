import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { uploadToCloudinary } from '../../services/cloudinary';
import type { CategoryRow, ProductRow } from '../../types/database';
import { validateProductForm, type ProductFormData } from '../../utils/productForm';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData) => Promise<void>;
  categories: CategoryRow[];
  initialData?: ProductRow | null;
  onAddCategory?: (categoryName: string) => Promise<CategoryRow | null>;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  categories,
  initialData,
  onAddCategory,
}: ProductFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price ? String(initialData.price) : '');
      setCategoryId(initialData.category_id || '');
      setIsAvailable(initialData.is_available ?? true);
      setImageUrl(initialData.image_url || null);
    } else {
      setTitle('');
      setDescription('');
      setPrice('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setIsAvailable(true);
      setImageUrl(null);
    }
    setErrors({});
    setUploadError(null);
    setShowNewCategory(false);
    setNewCatName('');
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: unknown) {
      console.error('Error al subir la imagen:', err);
      setUploadError(
        err instanceof Error ? err.message : 'Error al subir la imagen a Cloudinary'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !onAddCategory) return;
    setAddingCat(true);
    try {
      const created = await onAddCategory(newCatName.trim());
      if (created) {
        setCategoryId(created.id);
        setShowNewCategory(false);
        setNewCatName('');
      }
    } catch (err: unknown) {
      console.error('Error creando categoría:', err);
    } finally {
      setAddingCat(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const formData: ProductFormData = {
      title,
      description: description.trim() ? description.trim() : null,
      price,
      category_id: categoryId,
      is_available: isAvailable,
      image_url: imageUrl,
    };

    const validation = validateProductForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      console.error('Error al guardar producto:', err);
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al guardar el producto.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative my-8">
        <div className="flex justify-between items-center mb-5 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Producto' : 'Agregar Producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label htmlFor="product-title" className="block text-sm font-medium text-gray-700 mb-1">
              Título del Producto
            </label>
            <input
              id="product-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Hamburguesa Doble Queso"
              className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ingredientes, acompañantes o notas del plato..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Precio y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio ($)
              </label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-600">{errors.price}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="product-category" className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                {onAddCategory && !showNewCategory && (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Nueva
                  </button>
                )}
              </div>

              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nombre categoría"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={addingCat || !newCatName.trim()}
                    className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  id="product-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                    errors.category_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              {errors.category_id && (
                <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>
              )}
            </div>
          </div>

          {/* Imagen Cloudinary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen del Producto
            </label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-20 h-20 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl font-bold"
                    title="Quitar imagen"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-1 flex-shrink-0">
                  Sin Foto
                </div>
              )}

              <div className="flex-grow">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadingImage && (
                  <p className="mt-1 text-xs text-indigo-600 font-medium animate-pulse">
                    Subiendo imagen a Cloudinary...
                  </p>
                )}
                {uploadError && (
                  <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="product-available"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="product-available" className="text-sm font-medium text-gray-800">
              Disponible para la venta
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || uploadingImage}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
