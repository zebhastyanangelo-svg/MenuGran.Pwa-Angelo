import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CartProvider } from '../context/CartContext';
import { useCart } from '../hooks/useCart';
import type { ProductRow } from '../types/database';

function buildProduct(id: string, merchantId: string, title: string, price: string): ProductRow {
  return {
    id,
    merchant_id: merchantId,
    category_id: 'cat-1',
    title,
    description: `Descripción de ${title}`,
    price,
    image_url: null,
    is_available: true,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function buildDiscountedProduct(
  id: string,
  merchantId: string,
  title: string,
  price: string,
  discount_percentage: number | null,
): ProductRow {
  return { ...buildProduct(id, merchantId, title, price), discount_percentage };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

describe('useCart', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    vi.unstubAllGlobals();
  });

  describe('addItem', () => {
    it('agrega un producto al carrito', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('p1');
      expect(result.current.totalItems).toBe(1);
    });

    it('aumenta la cantidad si el producto ya existe', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it('persistencia en localStorage', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'menugram_cart',
        expect.any(String),
      );
    });
  });

  describe('removeItem', () => {
    it('elimina un producto del carrito', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });

      act(() => {
        result.current.removeItem('p1');
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('actualiza la cantidad de un producto', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });

      act(() => {
        result.current.updateQuantity('p1', 3);
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    it('elimina el producto si cantidad es 0 o menos', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });

      act(() => {
        result.current.updateQuantity('p1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('vacía completamente el carrito', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product1 = buildProduct('p1', 'm1', 'Pizza', '150.00');
      const product2 = buildProduct('p2', 'm1', 'Tacos', '100.00');

      act(() => {
        result.current.addItem(product1);
        result.current.addItem(product2);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('totalAmount', () => {
    it('calcula el total correctamente', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product1 = buildProduct('p1', 'm1', 'Pizza', '150.00');
      const product2 = buildProduct('p2', 'm1', 'Tacos', '100.50');

      act(() => {
        result.current.addItem(product1, 2);
        result.current.addItem(product2, 1);
      });

      expect(result.current.totalAmount).toBe('400.50');
    });
  });

  describe('descuentos', () => {
    it('guarda el precio unitario con el descuento del plato aplicado', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildDiscountedProduct('p1', 'm1', 'Arepa', '5.00', 20);

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items[0].unitPrice).toBe(4);
      expect(result.current.items[0].discountPercentage).toBe(20);
      expect(result.current.totalAmount).toBe('4.00');
    });

    it('aplica el descuento general del comercio cuando el plato no tiene', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildDiscountedProduct('p1', 'm1', 'Arepa', '5.00', null);

      act(() => {
        result.current.addItem(product, 1, undefined, 10);
      });

      expect(result.current.items[0].unitPrice).toBe(4.5);
      expect(result.current.items[0].discountPercentage).toBe(10);
      expect(result.current.totalAmount).toBe('4.50');
    });

    it('el descuento del plato gana sobre el general del comercio', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildDiscountedProduct('p1', 'm1', 'Arepa', '5.00', 4);

      act(() => {
        result.current.addItem(product, 1, undefined, 3);
      });

      expect(result.current.items[0].unitPrice).toBe(4.8);
      expect(result.current.items[0].discountPercentage).toBe(4);
      expect(result.current.totalAmount).toBe('4.80');
    });

    it('no aplica descuento cuando ni el plato ni el comercio tienen', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildDiscountedProduct('p1', 'm1', 'Arepa', '5.00', null);

      act(() => {
        result.current.addItem(product, 1, undefined, null);
      });

      expect(result.current.items[0].unitPrice).toBe(5);
      expect(result.current.items[0].discountPercentage).toBe(null);
      expect(result.current.totalAmount).toBe('5.00');
    });

    it('confirmAddItem guarda el precio descontado y actualiza el total', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildDiscountedProduct('p1', 'm1', 'Arepa', '5.00', 20);

      act(() => {
        result.current.confirmAddItem(product, 1, undefined, null);
        result.current.confirmAddItem(product, 1, undefined, null);
      });

      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.items[0].unitPrice).toBe(4);
      expect(result.current.totalAmount).toBe('8.00');
    });
  });

  describe('merchantId validation', () => {
    it('detecta productos de diferentes comercios', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product1 = buildProduct('p1', 'm1', 'Pizza', '150.00');
      const product2 = buildProduct('p2', 'm2', 'Burger', '200.00');

      act(() => {
        result.current.addItem(product1);
      });

      expect(result.current.canCheckout).toBe(true);
      expect(result.current.merchantId).toBe('m1');

      act(() => {
        result.current.addItem(product2);
      });

      expect(result.current.canCheckout).toBe(false);
      expect(result.current.merchantId).toBe(null);
      expect(result.current.validationError).toContain('diferentes comercios');
    });
  });

  describe('confirmAddItem', () => {
    it('agrega el producto cuando el carrito está vacío', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      let res: ReturnType<typeof result.current.confirmAddItem>;
      act(() => {
        res = result.current.confirmAddItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(res!.action).toBe('added');
      if (res!.action === 'added') {
        expect(res!.merchantId).toBe('m1');
      }
    });

    it('agrega al mismo comercio sin limpiar', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product1 = buildProduct('p1', 'm1', 'Pizza', '150.00');
      const product2 = buildProduct('p2', 'm1', 'Tacos', '100.00');

      act(() => {
        result.current.addItem(product1);
      });

      let res: ReturnType<typeof result.current.confirmAddItem>;
      act(() => {
        res = result.current.confirmAddItem(product2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.merchantId).toBe('m1');
      expect(res!.action).toBe('added');
    });

    it('vacía el carrito y agrega el producto de otro comercio', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const product1 = buildProduct('p1', 'm1', 'Pizza', '150.00');
      const product2 = buildProduct('p2', 'm2', 'Burger', '200.00');

      act(() => {
        result.current.addItem(product1);
      });

      expect(result.current.items).toHaveLength(1);

      let res: ReturnType<typeof result.current.confirmAddItem>;
      act(() => {
        res = result.current.confirmAddItem(product2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('p2');
      expect(result.current.merchantId).toBe('m2');
      expect(res!.action).toBe('cleared-then-added');
    });
  });

  describe('toggleExcludedIngredient', () => {
    it('marca y desmarca un ingrediente sin sacarlo de la lista', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(buildProduct('p1', 'm1', 'Pizza', '150.00'));
      });

      act(() => {
        result.current.toggleExcludedIngredient('p1', 'Cebolla');
      });

      expect(result.current.items[0].excludedIngredients).toEqual(['Cebolla']);

      act(() => {
        result.current.toggleExcludedIngredient('p1', 'cebolla');
      });

      expect(result.current.items[0].excludedIngredients).toEqual([]);
    });

    it('no toca las líneas de otros platillos', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(buildProduct('p1', 'm1', 'Pizza', '150.00'));
      });
      act(() => {
        result.current.addItem(buildProduct('p2', 'm1', 'Tacos', '100.00'));
      });

      act(() => {
        result.current.toggleExcludedIngredient('p1', 'Queso');
      });

      expect(result.current.items[0].excludedIngredients).toEqual(['Queso']);
      expect(result.current.items[1].excludedIngredients).toEqual([]);
    });

    it('conserva las exclusiones al volver a agregar el mismo platillo', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = buildProduct('p1', 'm1', 'Pizza', '150.00');

      act(() => {
        result.current.addItem(product);
      });
      act(() => {
        result.current.toggleExcludedIngredient('p1', 'Cebolla');
      });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.items[0].excludedIngredients).toEqual(['Cebolla']);
    });
  });
});