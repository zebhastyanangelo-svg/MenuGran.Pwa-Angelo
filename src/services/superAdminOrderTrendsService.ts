import { supabase, TABLE_NAMES } from './supabase';
import type { OrderStatus } from '../types/database';

/** Filas crudas que interesa agregar para las tendencias del Super Admin. */
export interface OrderTrendRaw {
  created_at: string;
  total_amount: string;
  status: OrderStatus;
}

/** Agrupación de estados de pedido para la gráfica de barras. */
export type OrderStatusGroup = 'delivered' | 'cancelled' | 'in_process';

export interface StatusGroupMeta {
  key: OrderStatusGroup;
  label: string;
  color: string;
}

/**
 * Grupos de estado que aparecen en la gráfica de barras. El orden define el
 * orden de dibujo de las barras dentro de cada columna de día.
 */
export const ORDER_STATUS_GROUPS: StatusGroupMeta[] = [
  { key: 'delivered', label: 'Entregado', color: '#10B981' },
  { key: 'in_process', label: 'En proceso', color: '#F59E0B' },
  { key: 'cancelled', label: 'Cancelado', color: '#EF4444' },
];

/** Punto de la tendencia de ingresos (agrupado por día). */
export interface RevenueTrendPoint {
  /** Fecha ISO YYYY-MM-DD (UTC), determinista para tests. */
  date: string;
  /** Días atrás respecto a `now` (0 = hoy). */
  dayOffset: number;
  /** Suma de `total_amount` de los pedidos del día. */
  revenue: number;
}

/** Punto de la tendencia de estados de pedido (agrupado por día). */
export interface OrderStatusTrend {
  date: string;
  dayOffset: number;
  counts: Record<OrderStatusGroup, number>;
}

/** Ventana temporal por defecto de las tendencias (últimos 30 días). */
export const TREND_WINDOW_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convierte un Date a una clave de día ISO (YYYY-MM-DD) en UTC. Es
 * determinista (no depende de la zona horaria del runtime) por lo que es
 * segura de usar en tests.
 */
export function toLocalDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Reduce el conjunto completo de `OrderStatus` al grupo usado en la
 * gráfica: `delivered` y `cancelled` son literales; el resto se agrupa
 * como `in_process`.
 */
export function toStatusGroup(status: OrderStatus): OrderStatusGroup {
  if (status === 'delivered') return 'delivered';
  if (status === 'cancelled') return 'cancelled';
  return 'in_process';
}

/**
 * Días de antigüedad de un pedido respecto al momento `now`. Usa aritmética
 * de epoch-ms por lo que es independiente de la zona horaria. Un pedido en el
 * futuro (clock skew) se asigna al día de hoy (offset 0).
 */
function dayOffsetFromNow(now: Date, createdAt: string): number {
  const elapsed = now.getTime() - new Date(createdAt).getTime();
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / DAY_MS);
}

const EMPTY_COUNTS: Record<OrderStatusGroup, number> = {
  delivered: 0,
  cancelled: 0,
  in_process: 0,
};

/**
 * Construye los puntos vacíos (uno por día) de la ventana solicitada, del más
 * antiguo al más reciente. Cada punto ya lleva su clave de día calculada a
 * partir de `now`.
 */
function buildEmptyRevenuePoints(
  days: number,
  now: Date,
): RevenueTrendPoint[] {
  const points: RevenueTrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    points.push({
      date: toLocalDateKey(new Date(now.getTime() - offset * DAY_MS)),
      dayOffset: offset,
      revenue: 0,
    });
  }
  return points;
}

function buildEmptyStatusPoints(
  days: number,
  now: Date,
): OrderStatusTrend[] {
  const points: OrderStatusTrend[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    points.push({
      date: toLocalDateKey(new Date(now.getTime() - offset * DAY_MS)),
      dayOffset: offset,
      counts: { ...EMPTY_COUNTS },
    });
  }
  return points;
}

function parseAmount(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula la tendencia de ingresos diarios a partir de pedidos crudos.
 *
 * - Los pedidos se asignan a un día mediante aritmética de epoch-ms
 *   (determinístico y sin dependencia de zona horaria).
 * - Los pedidos fuera de la ventana (`days`) se descartan.
 * - El arreglo resulta ordenado de más antiguo a más reciente.
 */
export function computeRevenueTrend(
  orders: OrderTrendRaw[],
  days: number = TREND_WINDOW_DAYS,
  now: Date = new Date(),
): RevenueTrendPoint[] {
  const points = buildEmptyRevenuePoints(days, now);
  const byOffset = new Map<number, RevenueTrendPoint>();
  for (const point of points) {
    byOffset.set(point.dayOffset, point);
  }
  for (const order of orders) {
    const offset = dayOffsetFromNow(now, order.created_at);
    if (offset >= days) continue;
    const bucket = byOffset.get(offset);
    if (bucket !== undefined) {
      bucket.revenue += parseAmount(order.total_amount);
    }
  }
  return points;
}

/**
 * Calcula la tendencia de pedidos por estado y día a partir de pedidos crudos.
 *
 * El resultado queda ordenado de más antiguo a más reciente y cada día incluye
 * siempre los tres grupos (relleno con ceros).
 */
export function computeOrderStatusTrend(
  orders: OrderTrendRaw[],
  days: number = TREND_WINDOW_DAYS,
  now: Date = new Date(),
): OrderStatusTrend[] {
  const points = buildEmptyStatusPoints(days, now);
  const byOffset = new Map<number, OrderStatusTrend>();
  for (const point of points) {
    byOffset.set(point.dayOffset, point);
  }
  for (const order of orders) {
    const offset = dayOffsetFromNow(now, order.created_at);
    if (offset >= days) continue;
    const bucket = byOffset.get(offset);
    if (bucket !== undefined) {
      bucket.counts[toStatusGroup(order.status)] += 1;
    }
  }
  return points;
}

/**
 * Obtiene los pedidos de la ventana temporal solicitada para construir las
 * tendencias. Sólo lectura: respeta las políticas RLS de Supabase.
 */
export async function fetchOrdersForTrends(
  days: number = TREND_WINDOW_DAYS,
): Promise<OrderTrendRaw[]> {
  if (days <= 0) {
    throw new Error('El número de días debe ser positivo.');
  }
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .select('created_at, total_amount, status')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error !== null) {
    throw new Error(
      `Error al obtener tendencias de pedidos: ${error.message}`,
    );
  }
  return (data ?? []) as OrderTrendRaw[];
}
