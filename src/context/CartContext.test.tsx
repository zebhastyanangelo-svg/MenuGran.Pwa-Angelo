import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CartProvider, type CartItem } from '../context/CartContext';
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
});