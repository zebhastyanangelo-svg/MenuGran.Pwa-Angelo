export interface ProductFormData {
  title: string;
  description: string | null;
  price: string;
  category_id: string;
  is_available: boolean;
  image_url: string | null;
}

export interface CategoryFormData {
  name: string;
  sort_order: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Parsea un precio numérico o string y lo devuelve formateado a dos decimales.
 * Devuelve null si no es un número finito positivo (> 0).
 */
export function parsePrice(input: string | number): string | null {
  try {
    const numericValue = typeof input === 'number' ? input : parseFloat(input);
    if (isNaN(numericValue) || !isFinite(numericValue) || numericValue <= 0) {
      return null;
    }
    return numericValue.toFixed(2);
  } catch {
    return null;
  }
}

/**
 * Valida los datos del formulario de creación/edición de producto.
 */
export function validateProductForm(data: ProductFormData): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmedTitle = data.title ? data.title.trim() : '';
  if (!trimmedTitle) {
    errors.title = 'El título es obligatorio.';
  }

  const parsedPrice = parsePrice(data.price);
  if (parsedPrice === null) {
    errors.price = 'El precio debe ser un número mayor a 0.';
  }

  const trimmedCategoryId = data.category_id ? data.category_id.trim() : '';
  if (!trimmedCategoryId) {
    errors.category_id = 'Debes seleccionar una categoría.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida los datos del formulario de categoría.
 */
export function validateCategoryForm(data: CategoryFormData): ValidationResult {
  const errors: Record<string, string> = {};

  const trimmedName = data.name ? data.name.trim() : '';
  if (!trimmedName) {
    errors.name = 'El nombre de la categoría es obligatorio.';
  }

  if (
    typeof data.sort_order !== 'number' ||
    isNaN(data.sort_order) ||
    data.sort_order < 0
  ) {
    errors.sort_order = 'El orden debe ser un número entero mayor o igual a 0.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
