import type { OrderRow } from '../types/database';

/**
 * Utilidades de almacenamiento local para la estrategia offline.
 *
 * Persisten la última(s) orden(es) vista(s) en OrderTracker usando la API
 * nativa de Web Storage (localStorage). No se añaden dependencias externas,
 * manteniendo el costo operativo en $0.
 *
 * Se siguen las convenciones de `cart.ts`: guards SSR, try/catch explícito
 * y clamping del número de entradas para evitar crecimiento ilimitado.
 */

const ORDER_CACHE_KEY = 'menugram_order_cache_v1';
const MAX_CACHED_ORDERS = 10;

interface CachedOrderEntry {
  order: OrderRow;
  viewedAt: number;
}

interface OrderCache {
  orders: CachedOrderEntry[];
}

function isLocalStorageAvailable(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const testKey = '__menugram_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readCache(): OrderCache {
  if (!isLocalStorageAvailable()) {
    return { orders: [] };
  }
  try {
    const stored = localStorage.getItem(ORDER_CACHE_KEY);
    if (stored === null) {
      return { orders: [] };
    }
    const parsed = JSON.parse(stored) as Partial<OrderCache>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.orders)) {
      return { orders: [] };
    }
    return { orders: parsed.orders };
  } catch {
    return { orders: [] };
  }
}

function writeCache(cache: OrderCache): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  try {
    localStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

function normalizeOrder(raw: unknown): OrderRow | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.merchant_id !== 'string' ||
    typeof candidate.status !== 'string' ||
    typeof candidate.payment_method !== 'string' ||
    typeof candidate.total_amount !== 'string' &&
    typeof candidate.total_amount !== 'number' ||
    typeof candidate.created_at !== 'string'
  ) {
    return null;
  }
  return candidate as unknown as OrderRow;
}

export function saveOrder(order: OrderRow): boolean {
  if (!order || typeof order.id !== 'string') {
    return false;
  }
  const cache = readCache();
  const now = Date.now();
  const filtered = cache.orders.filter((entry) => entry.order.id !== order.id);
  filtered.unshift({ order, viewedAt: now });
  const trimmed = filtered.slice(0, MAX_CACHED_ORDERS);
  return writeCache({ orders: trimmed });
}

export function getOrder(orderId: string): OrderRow | null {
  const cache = readCache();
  const entry = cache.orders.find((entry) => entry.order.id === orderId);
  if (!entry) {
    return null;
  }
  const normalized = normalizeOrder(entry.order);
  return normalized;
}

export function getLastOrder(): OrderRow | null {
  const cache = readCache();
  if (cache.orders.length === 0) {
    return null;
  }
  const entry = cache.orders[0];
  const normalized = normalizeOrder(entry.order);
  return normalized;
}

export function getOrderHistory(): OrderRow[] {
  const cache = readCache();
  return cache.orders
    .map((entry) => normalizeOrder(entry.order))
    .filter((order): order is OrderRow => order !== null);
}

export function clearOrderCache(): boolean {
  return writeCache({ orders: [] });
}

export function getOrderCacheSize(): number {
  const cache = readCache();
  return cache.orders.length;
}
