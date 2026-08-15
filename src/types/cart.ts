import type { ProductRow } from './database';

export interface CartItem {
  product: ProductRow;
  quantity: number;
  notes?: string;
}

export type AddItemResult =
  | { action: 'added'; merchantId: string }
  | { action: 'cleared-then-added' };

export interface CartContextValue {
  items: CartItem[];
  addItem: (product: ProductRow, quantity?: number, notes?: string) => void;
  confirmAddItem: (
    product: ProductRow,
    quantity?: number,
    notes?: string,
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
    return parsed.filter((item): item is CartItem => {
      return (
        item !== null &&
        item.product !== null &&
        item.quantity > 0
      );
    });
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
