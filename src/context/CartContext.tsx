import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AddItemResult, CartItem, CartContextValue } from '../types/cart';
import type { ProductRow } from '../types/database';
import { loadCartFromStorage, saveCartToStorage } from '../types/cart';

export const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const merchantId = useMemo(() => {
    if (items.length === 0) {
      return null;
    }
    const firstMerchantId = items[0].product.merchant_id;
    const allSame = items.every((item) => item.product.merchant_id === firstMerchantId);
    return allSame ? firstMerchantId : null;
  }, [items]);

  const validationError = useMemo(() => {
    if (merchantId === null && items.length > 0) {
      return 'No puedes agregar productos de diferentes comercios al mismo carrito. Vacía el carrito antes de cambiar de comercio.';
    }
    return null;
  }, [merchantId, items.length]);

  const canCheckout = useMemo(() => {
    return items.length > 0 && validationError === null;
  }, [items.length, validationError]);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const total = items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.product.price);
      return sum + unitPrice * item.quantity;
    }, 0);
    return total.toFixed(2);
  }, [items]);

  const addItem = useCallback((product: ProductRow, quantity: number = 1, notes?: string): void => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id,
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          notes: notes ?? updated[existingIndex].notes,
        };
        return updated;
      }

      return [...prev, { product, quantity, notes }];
    });
  }, []);

  const confirmAddItem = useCallback(
    (product: ProductRow, quantity: number = 1, notes?: string): AddItemResult => {
      const hasItems = items.length > 0;
      const differentMerchant = hasItems && items[0].product.merchant_id !== product.merchant_id;

      if (differentMerchant) {
        setItems([{ product, quantity, notes }]);
        return { action: 'cleared-then-added' };
      }

      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.product.id === product.id,
        );

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
            notes: notes ?? updated[existingIndex].notes,
          };
          return updated;
        }

        return [...prev, { product, quantity, notes }];
      });

      return { action: 'added', merchantId: product.merchant_id };
    },
    [items],
  );

  const removeItem = useCallback((productId: string): void => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number): void => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const clearCart = useCallback((): void => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      confirmAddItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
      canCheckout,
      validationError,
      merchantId,
    }),
     [
       items,
       addItem,
       confirmAddItem,
       removeItem,
       updateQuantity,
       clearCart,
       totalItems,
       totalAmount,
       canCheckout,
       validationError,
       merchantId,
     ],
   );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}