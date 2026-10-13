import type { ProductRow } from './database';
import { resolveUnitPrice } from '../utils/cartPricing';

export interface CartItem {
  product: ProductRow;
  quantity: number;
  notes?: string;
  /**
   * Descuento porcentual general del comercio vigente al agregar el plato.
   * Se guarda para poder recalcular precios de carritos persistidos.
   */
  merchantDiscountPercentage?: number | null;
  /** Precio unitario efectivo ya con el descuento aplicado. */
  unitPrice: number;
  /** Porcentaje de descuento aplicado a la línea; `null` si no hay. */
  discountPercentage: number | null;
}

export type AddItemResult =
  | { action: 'added'; merchantId: string }
  | { action: 'cleared-then-added' };

export interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: ProductRow,
    quantity?: number,
    notes?: string,
    merchantDiscountPercentage?: number | null,
  ) => void;
  confirmAddItem: (
    product: ProductRow,
    quantity?: number,
    notes?: string,
    merchantDiscountPercentage?: number | null,
  ) => AddItemResult;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: string;
  canCheckout: boolean;
  validationError: string | null;
  merchantId: string | null;
}

const CART_STORAGE_KEY = 'menugram_cart';

/**
 * Completa los campos de precio con descuento de carritos guardados antes de
 * que existiera esta funcionalidad: recalcula con el descuento del plato y,
 * si no, con el descuento del comercio almacenado en la propia línea.
 */
function normalizeStoredCartItem(item: CartItem): CartItem {
  if (
    typeof item.unitPrice === 'number' &&
    Number.isFinite(item.unitPrice) &&
    item.discountPercentage !== undefined
  ) {
    return item;
  }
  const resolved = resolveUnitPrice(
    item.product.price,
    item.product.discount_percentage,
    item.merchantDiscountPercentage,
  );
  return {
    ...item,
    unitPrice: resolved.unitPrice,
    discountPercentage: resolved.discountPercentage,
  };
}

export function loadCartFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored === null) {
      return [];
    }
    const parsed = JSON.parse(stored) as CartItem[];
    return parsed
      .filter((item): item is CartItem => {
        return (
          item !== null &&
          item.product !== null &&
          item.quantity > 0
        );
      })
      .map(normalizeStoredCartItem);
  } catch {
    return [];
  }
}

export function saveCartToStorage(items: CartItem[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
  }
}

export function formatPrice(price: string | number): string {
  const numeric = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numeric)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(numeric);
}
