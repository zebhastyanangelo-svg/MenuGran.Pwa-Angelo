import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveOrder,
  getOrder,
  getLastOrder,
  getOrderHistory,
  clearOrderCache,
  getOrderCacheSize,
} from './offlineStorage';
import type { OrderRow } from '../types/database';

const ORDER_CACHE_KEY = 'menugram_order_cache_v1';

function buildOrder(
  id: string,
  overrides: Partial<OrderRow> = {},
): OrderRow {
  return {
    id,
    merchant_id: 'merchant-1',
    customer_id: 'customer-1',
    type: 'delivery',
    status: 'confirmed',
    payment_method: 'card',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '100.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    items: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

interface StorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  key: ReturnType<typeof vi.fn>;
}

function createStorageMock(): StorageMock {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string): string | null => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
  };
}

let storageMock: StorageMock;

describe('offlineStorage', () => {
  beforeEach(() => {
    storageMock = createStorageMock();
    vi.stubGlobal('localStorage', storageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('saveOrder + getOrder', () => {
    it('persiste y recupera una orden por id', () => {
      const order = buildOrder('order-1');
      expect(saveOrder(order)).toBe(true);

      const result = getOrder('order-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('order-1');
      expect(result?.status).toBe('confirmed');
    });

    it('retorna null cuando la orden no está en caché', () => {
      expect(getOrder('non-existent')).toBeNull();
    });

    it('actualiza la orden cacheada si ya existe con el mismo id', () => {
      saveOrder(buildOrder('order-1', { status: 'confirmed' }));
      saveOrder(buildOrder('order-1', { status: 'preparing' }));

      const result = getOrder('order-1');
      expect(result?.status).toBe('preparing');
      expect(getOrderCacheSize()).toBe(1);
    });
  });

  describe('getLastOrder', () => {
    it('retorna la orden más recientemente guardada', () => {
      saveOrder(buildOrder('order-a'));
      saveOrder(buildOrder('order-b'));

      const result = getLastOrder();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('order-b');
    });

    it('retorna null cuando no hay órdenes cacheadas', () => {
      expect(getLastOrder()).toBeNull();
    });
  });

  describe('getOrderHistory', () => {
    it('devuelve todas las órdenes cacheadas', () => {
      saveOrder(buildOrder('order-1'));
      saveOrder(buildOrder('order-2'));
      saveOrder(buildOrder('order-3'));

      expect(getOrderHistory()).toHaveLength(3);
    });

    it('devuelve un arreglo vacío cuando no hay caché', () => {
      expect(getOrderHistory()).toEqual([]);
    });

    it('limita el número de órdenes cacheadas al máximo (10)', () => {
      for (let i = 0; i < 15; i++) {
        saveOrder(buildOrder(`order-${i}`));
      }

      expect(getOrderCacheSize()).toBe(10);
    });
  });

  describe('clearOrderCache', () => {
    it('elimina todas las órdenes cacheadas', () => {
      saveOrder(buildOrder('order-1'));
      saveOrder(buildOrder('order-2'));

      expect(getOrderCacheSize()).toBe(2);

      expect(clearOrderCache()).toBe(true);
      expect(getOrderCacheSize()).toBe(0);
      expect(getOrderHistory()).toEqual([]);
    });
  });

  describe('integridad de datos', () => {
    it('ignora la entrada cacheada cuando el shape es inválido', () => {
      storageMock.setItem(ORDER_CACHE_KEY, '{ "orders": "not-an-array" }');

      expect(getOrder('whatever')).toBeNull();
      expect(getLastOrder()).toBeNull();
      expect(getOrderHistory()).toEqual([]);
    });

    it('ignora la entrada cacheada cuando el JSON está corrupto', () => {
      storageMock.setItem(ORDER_CACHE_KEY, '{ corrupted json');

      expect(getLastOrder()).toBeNull();
      expect(getOrderHistory()).toEqual([]);
    });

    it('ignora la entrada cacheada cuando localStorage lanza error', () => {
      storageMock.getItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(getOrder('whatever')).toBeNull();
      expect(getLastOrder()).toBeNull();
      expect(getOrderHistory()).toEqual([]);
    });

    it('retorna false al intentar escribir cuando localStorage falla', () => {
      storageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(saveOrder(buildOrder('order-1'))).toBe(false);
    });

    it('retorna false al limpiar cuando localStorage falla', () => {
      storageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(clearOrderCache()).toBe(false);
    });
  });

  describe('seguridad SSR / entorno sin localStorage', () => {
    it('retorna null sin lanzar cuando localStorage no está disponible', () => {
      vi.stubGlobal('localStorage', undefined as unknown as Storage);

      expect(getOrder('order-1')).toBeNull();
      expect(getLastOrder()).toBeNull();
      expect(getOrderHistory()).toEqual([]);
      expect(clearOrderCache()).toBe(false);
      expect(getOrderCacheSize()).toBe(0);
      expect(saveOrder(buildOrder('order-1'))).toBe(false);
    });
  });

  describe('saveOrder valida entrada', () => {
    it('retorna false para un input nulo', () => {
      expect(saveOrder(null as unknown as OrderRow)).toBe(false);
    });

    it('retorna false para un input sin id string', () => {
      const invalid = buildOrder('order-1');
      delete (invalid as Partial<OrderRow>).id;
      expect(saveOrder(invalid)).toBe(false);
    });
  });
});
