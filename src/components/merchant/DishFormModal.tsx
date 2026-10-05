import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { uploadToImgBB } from '../../services/imgbb';
import {
  ImageUploadField,
  type ImageFieldState,
} from './ImageUploadField';
import type { CategoryRow, ProductRow } from '../../types/database';
import { validateProductForm, type ProductFormData } from '../../utils/productForm';
import {
  BADGE_LABEL_SUGGESTIONS,
  MAX_DISCOUNT_PERCENTAGE,
  MIN_DISCOUNT_PERCENTAGE,
  formatDiscountBadge,
  isDiscountPercentageInputInvalid,
  parseBadgeLabel,
  parseDiscountPercentage,
} from '../../utils/promos';
import posthog, { isPostHogEnabled } from '../../posthog';

export interface DishFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dishData: ProductFormData) => Promise<void>;
  categories: CategoryRow[];
  initialData?: ProductRow | null;
  onAddCategory?: (categoryName: string) => Promise<CategoryRow | null>;
}

/**
 * Errores de los campos de promoción que dependen del texto crudo del input.
 * `parseDiscountPercentage` normaliza a `null` los valores inválidos, así que
 * sin esta comprobación un descuento fuera de rango se descartaría en silencio
 * y el comercio creería que quedó guardado.
 */
function collectPromoErrors(discountInput: string): Record<string, string> {
  if (!isDiscountPercentageInputInvalid(discountInput)) return {};
  return {
    discount_percentage: `El descuento debe estar entre ${MIN_DISCOUNT_PERCENTAGE} y ${MAX_DISCOUNT_PERCENTAGE}%.`,
  };
}

export function DishFormModal({
  isOpen,
  onClose,
  onSave,
  categories,
  initialData,
  onAddCategory,
}: DishFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [badgeLabel, setBadgeLabel] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [image, setImage] = useState<ImageFieldState>({
    url: null,
    uploading: false,
    error: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
      setBadgeLabel(initialData.badge_label ?? '');
      setDiscountPercentage(
        initialData.discount_percentage != null
          ? String(initialData.discount_percentage)
          : '',
      );
      setImage({
        url: initialData.image_url || null,
        uploading: false,
        error: null,
      });
    } else {
      setTitle('');
      setDescription('');
      setPrice('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setIsAvailable(true);
      setBadgeLabel('');
      setDiscountPercentage('');
      setImage({ url: null, uploading: false, error: null });
    }
    setErrors({});
    setShowNewCategory(false);
    setNewCatName('');
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage((prev) => ({ ...prev, uploading: true, error: null }));

    try {
      const url = await uploadToImgBB(file);
      setImage({ url, uploading: false, error: null });
    } catch (err: unknown) {
      setImage((prev) => ({
        ...prev,
        uploading: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error al subir la imagen a ImgBB',
      }));
    }
  };

  const handleRemoveImage = () =>
    setImage({ url: null, uploading: false, error: null });

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
      image_url: image.url,
      badge_label: parseBadgeLabel(badgeLabel),
      discount_percentage: parseDiscountPercentage(discountPercentage),
    };

    const validation = validateProductForm(formData);
    const promoErrors = collectPromoErrors(discountPercentage);
    if (!validation.isValid || Object.keys(promoErrors).length > 0) {
      setErrors({ ...validation.errors, ...promoErrors });
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      await onSave(formData);
      if (isPostHogEnabled) {
        posthog.capture('menu_item_saved', {
          action: initialData ? 'updated' : 'created',
          is_available: isAvailable,
          has_image: image.url !== null,
          has_badge: formData.badge_label !== null,
          has_discount: formData.discount_percentage !== null,
        });
      }
      onClose();
    } catch (err: unknown) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al guardar el platillo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const discountPreview = formatDiscountBadge(discountPercentage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative my-8">
        <div className="flex justify-between items-center mb-5 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Platillo' : 'Nuevo Platillo'}
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

        {/* `noValidate` delega la validación en `validateProductForm`: la validación
            nativa del navegador bloquea el submit (y muestra tooltips en inglés)
            cuando el descuento queda fuera de rango, ocultando el mensaje
            propio que explica cómo corregirlo. */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre del platillo */}
          <div>
            <label
              htmlFor="dish-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre del Platillo
            </label>
            <input
              id="dish-title"
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
            <label
              htmlFor="dish-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descripción (Opcional)
            </label>
            <textarea
              id="dish-description"
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
              <label
                htmlFor="dish-price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Precio ($)
              </label>
              <input
                id="dish-price"
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
                <label
                  htmlFor="dish-category"
                  className="block text-sm font-medium text-gray-700"
                >
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
                  id="dish-category"
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
                <p className="mt-1 text-xs text-red-600">
                  {errors.category_id}
                </p>
              )}
            </div>
          </div>

          {/* Imagen del platillo */}
          <ImageUploadField
            label="Imagen del Platillo"
            fieldName="dish"
            value={image}
            onFileChange={handleImageChange}
            onRemove={handleRemoveImage}
          />

          {/* Etiqueta y descuento: se muestran como chips flotantes en el menú */}
          <fieldset className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
              Etiqueta y descuento (opcional)
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dish-badge"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Etiqueta
                </label>
                <input
                  id="dish-badge"
                  type="text"
                  list="dish-badge-suggestions"
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  placeholder="Ej. Más vendido"
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                    errors.badge_label ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <datalist id="dish-badge-suggestions">
                  {BADGE_LABEL_SUGGESTIONS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-gray-500">
                  Se muestra como chip sobre el plato (Ej. “Más vendido”, “2x1”).
                </p>
                {errors.badge_label && (
                  <p className="mt-1 text-xs text-red-600">{errors.badge_label}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="dish-discount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Descuento (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="dish-discount"
                    type="number"
                    min={1}
                    max={MAX_DISCOUNT_PERCENTAGE}
                    step={1}
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    placeholder="0"
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      errors.discount_percentage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {discountPreview !== null && (
                    <span
                      className="shrink-0 rounded-full bg-brand-red px-2.5 py-1 text-xs font-semibold text-white"
                      data-testid="dish-discount-preview"
                    >
                      {discountPreview}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Vacío o 0 para no aplicar descuento.
                </p>
                {errors.discount_percentage && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.discount_percentage}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Disponibilidad */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="dish-available"
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="dish-available"
              className="text-sm font-medium text-gray-800"
            >
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
              disabled={isSaving || image.uploading}
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
