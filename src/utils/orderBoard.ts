/**
 * Derivaciones puras del Tablero de Pedidos en Vivo.
 *
 * Todo lo que el tablero necesita calcular —agrupaciones por estado, KPIs de
 * cabecera, búsqueda inteligente, rango de fechas y formateo de moneda— vive
 * aquí y sin estado de React, para que la vista sea declarativa y cada regla
 * de negocio quede cubierta por tests unitarios propios.
 */

import type { OrderStatus, PaymentMethod } from '../types/database';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';

/* ---------- Pestañas de estado con contadores ---------- */

export type OrderBoardTabKey =
  | 'all'
  | 'payment_pending'
  | 'kitchen'
  | 'dispatch'
  | 'delivered'
  | 'cancelled';

export interface OrderBoardTab {
  key: OrderBoardTabKey;
  label: string;
  /** `null` significa "sin filtro de estado" (pestaña Todos). */
  statuses: readonly OrderStatus[] | null;
}

export const ORDER_BOARD_TABS: readonly OrderBoardTab[] = [
  { key: 'all', label: 'Todos', statuses: null },
  { key: 'payment_pending', label: 'Pendientes de Pago', statuses: ['payment_pending'] },
  { key: 'kitchen', label: 'En Cocina', statuses: ['confirmed', 'preparing'] },
  { key: 'dispatch', label: 'Listos / Reparto', statuses: ['ready', 'on_the_way'] },
  { key: 'delivered', label: 'Entregados', statuses: ['delivered'] },
  { key: 'cancelled', label: 'Cancelados', statuses: ['cancelled'] },
];

/** Estados que comparten un mismo grupo de la cabecera. */
const KITCHEN_STATUSES: readonly OrderStatus[] = ['confirmed', 'preparing'];
const DISPATCH_STATUSES: readonly OrderStatus[] = ['ready', 'on_the_way'];

/* ---------- Filtro por período ---------- */

export type OrderBoardPeriod = 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'all';

export interface OrderBoardPeriodOption {
  value: OrderBoardPeriod;
  label: string;
}

export const ORDER_BOARD_PERIODS: readonly OrderBoardPeriodOption[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'all', label: 'Todo el historial' },
];

/* ---------- Métricas de cabecera ---------- */

export interface OrderBoardAmount {
  count: number;
  usd: number;
  ves: number;
}

export interface OrderBoardKpis {
  pendingPayment: OrderBoardAmount;
  kitchen: { total: number; inProgress: number; queued: number };
  dispatch: { total: number; ready: number; onTheWay: number };
  todaySales: { count: number; usd: number; ves: number };
}

/* ---------- Conciliación de pago ---------- */

export type PaymentValidationState = 'awaiting' | 'missing_reference' | 'validated';

/* ---------- Helpers de lectura ---------- */

function hasStatus(order: OrderWithCustomer, statuses: readonly OrderStatus[]): boolean {
  return statuses.includes(order.status);
}

function sumUsd(orders: readonly OrderWithCustomer[]): number {
  return orders.reduce((total, order) => total + Number(order.total_amount ?? 0), 0);
}

function startOfToday(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

/* ---------- Identidad y tiempo ---------- */

/** Código corto que el comercio dicta por teléfono, p. ej. `#845F`. */
export function getOrderShortCode(orderId: string): string {
  return `#${orderId.slice(0, 4).toUpperCase()}`;
}

/** Tiempo transcurrido desde la creación, p. ej. `Hace 4 min`. */
export function formatElapsedTime(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '—';
  const minutes = Math.floor((now.getTime() - created.getTime()) / 60_000);
  if (minutes < 1) return 'Hace instantes';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

/** Fecha de la cabecera del tablero, p. ej. `Hoy, 24 de Octubre`. */
export function formatBoardDateLabel(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
  }).format(now);
  return `Hoy, ${formatted}`;
}

/* ---------- Moneda ---------- */

export function formatVes(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Convierte un monto en USD a bolívares con la tasa oficial sincronizada. */
export function toVes(usd: number, bcvRate: number): number {
  return bcvRate > 0 ? usd * bcvRate : 0;
}

/* ---------- Conciliación ---------- */

/**
 * Estado de validación de pago derivado del propio flujo de la orden: la caja
 * valida al mover el pedido fuera de `payment_pending`, así que no existe una
 * columna `payment_status` que consultar.
 */
export function getPaymentValidationState(
  order: OrderWithCustomer,
): PaymentValidationState {
  if (order.status !== 'payment_pending' && order.status !== 'cancelled') return 'validated';
  if (!order.payment_reference?.trim()) return 'missing_reference';
  return 'awaiting';
}

export function isPaymentValidated(order: OrderWithCustomer): boolean {
  return getPaymentValidationState(order) === 'validated';
}

/* ---------- Rango de fechas ---------- */

export interface OrderBoardDateRange {
  start: Date | null;
  end: Date | null;
}

export function getOrderBoardDateRange(
  period: OrderBoardPeriod,
  now: Date = new Date(),
): OrderBoardDateRange {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'all') return { start: null, end: null };
  if (period === 'today') return { start, end };
  if (period === 'last_7_days') {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (period === 'this_month') {
    start.setDate(1);
    return { start, end };
  }
  // Mes anterior completo: día 1 hasta el último día del mes previo.
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
  };
}

export function isOrderInRange(order: OrderWithCustomer, range: OrderBoardDateRange): boolean {
  if (!range.start || !range.end) return true;
  const created = new Date(order.created_at);
  return created >= range.start && created <= range.end;
}

/* ---------- Búsqueda inteligente ---------- */

function normalizeQuery(query: string): string {
  return query.trim().replace(/^#/, '').toLowerCase();
}

/** `0412-1234567` y `+584121234567` apuntan al mismo teléfono. */
function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('58')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function customerHaystack(order: OrderWithCustomer): { text: string; phones: string } {
  const profile = order.profiles;
  const parts = [profile?.full_name, profile?.ci, profile?.phone, profile?.email].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  return {
    text: parts.join(' ').toLowerCase(),
    phones: normalizePhoneDigits(parts.join('')),
  };
}

/**
 * Busca por código corto (`845F`), prefijo del UUID, nombre, cédula, teléfono
 * o correo del cliente. El prefijo `#` del código es opcional y el teléfono
 * se acepta en formato local (0412…) o internacional (+58412…).
 */
export function matchesOrderQuery(order: OrderWithCustomer, query: string): boolean {
  const term = normalizeQuery(query);
  if (term === '') return true;

  const digitsId = order.id.replace(/\D/g, '');
  const digitsTerm = term.replace(/\D/g, '');
  if (digitsTerm.length > 0 && digitsId.startsWith(digitsTerm)) return true;

  const haystack = customerHaystack(order);
  if (haystack.text.includes(term)) return true;

  const phoneTerm = normalizePhoneDigits(term);
  return phoneTerm.length >= 6 && haystack.phones.includes(phoneTerm);
}

/* ---------- Agregaciones ---------- */

function countOrders(orders: readonly OrderWithCustomer[], statuses: readonly OrderStatus[]): number {
  return orders.filter((order) => hasStatus(order, statuses)).length;
}

function buildAmount(orders: readonly OrderWithCustomer[], bcvRate: number): OrderBoardAmount {
  const usd = sumUsd(orders);
  return { count: orders.length, usd, ves: toVes(usd, bcvRate) };
}

/** Acumula los indicadores de las cuatro tarjetas de cabecera. */
export function getOrderBoardKpis(
  orders: readonly OrderWithCustomer[],
  bcvRate: number,
  now: Date = new Date(),
): OrderBoardKpis {
  const today = startOfToday(now);
  const salesToday = orders.filter(
    (order) => order.status !== 'cancelled' && new Date(order.created_at) >= today,
  );

  return {
    pendingPayment: buildAmount(orders.filter((o) => o.status === 'payment_pending'), bcvRate),
    kitchen: {
      total: countOrders(orders, KITCHEN_STATUSES),
      inProgress: countOrders(orders, ['preparing']),
      queued: countOrders(orders, ['confirmed']),
    },
    dispatch: {
      total: countOrders(orders, DISPATCH_STATUSES),
      ready: countOrders(orders, ['ready']),
      onTheWay: countOrders(orders, ['on_the_way']),
    },
    todaySales: {
      ...buildAmount(salesToday, bcvRate),
    },
  };
}

/** Contadores por pestaña, sobre el conjunto ya filtrado por los demás filtros. */
export function countOrdersByTab(
  orders: readonly OrderWithCustomer[],
): Record<OrderBoardTabKey, number> {
  const counts = {} as Record<OrderBoardTabKey, number>;
  for (const tab of ORDER_BOARD_TABS) {
    counts[tab.key] = tab.statuses ? countOrders(orders, tab.statuses) : orders.length;
  }
  return counts;
}

export function filterOrdersByTab(
  orders: readonly OrderWithCustomer[],
  tabKey: OrderBoardTabKey,
): OrderWithCustomer[] {
  const tab = ORDER_BOARD_TABS.find((candidate) => candidate.key === tabKey);
  const statuses = tab?.statuses ?? null;
  if (statuses === null) return [...orders];
  return orders.filter((order) => hasStatus(order, statuses));
}

export interface OrderBoardFilters {
  query: string;
  paymentMethod: PaymentMethod | 'all';
  range: OrderBoardDateRange;
}

/** Aplica búsqueda, método de pago y período; la pestaña se aplica aparte. */export function filterOrdersByFacets(
  orders: readonly OrderWithCustomer[],
  filters: OrderBoardFilters,
): OrderWithCustomer[] {
  return orders.filter((order) => {
    if (filters.paymentMethod !== 'all' && order.payment_method !== filters.paymentMethod) {
      return false;
    }
    if (!isOrderInRange(order, filters.range)) return false;
    return matchesOrderQuery(order, filters.query);
  });
}

/** Métodos de pago presentes en el set actual, para poblar el selector. */
export function collectAvailablePaymentMethods(
  orders: readonly OrderWithCustomer[],
): PaymentMethod[] {
  const methods = new Set<PaymentMethod>();
  for (const order of orders) methods.add(order.payment_method);
  return [...methods];
}
