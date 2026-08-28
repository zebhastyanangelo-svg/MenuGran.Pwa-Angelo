/**
 * Servicio de analíticas para el panel del comercio: datos para las gráficas
 * de tendencia de ventas y desglose de estados de pedido dentro de un rango
 * de fechas. Arquitectura de costo cero: Supabase (RLS) + cálculo en cliente.
 */
import { supabase, TABLE_NAMES } from './supabase';
import type { OrderStatus } from '../types/database';
import { DAY_MS, toLocalDateKey } from './superAdminOrderTrendsService';

export interface OrderAnalyticsRow {
  created_at: string;
  total_amount: string;
  status: OrderStatus;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface MerchantAnalytics {
  dailyRevenue: RevenueDataPoint[];
  statusBreakdown: StatusBreakdownItem[];
}

export const STATUS_GROUPS: {
  key: string;
  label: string;
  color: string;
  statuses: OrderStatus[];
}[] = [
  { key: 'delivered', label: 'Completados', color: '#10B981', statuses: ['delivered'] },
  {
    key: 'in_process',
    label: 'En proceso',
    color: '#F59E0B',
    statuses: ['confirmed', 'preparing', 'ready', 'on_the_way'],
  },
  { key: 'cancelled', label: 'Cancelados', color: '#EF4444', statuses: ['cancelled'] },
];

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function computeDayRange(startDate: string, endDate: string): Date[] {
  const start = parseIsoDate(startDate).getTime();
  const end = parseIsoDate(endDate).getTime() + DAY_MS - 1;
  const days: Date[] = [];
  let current = start;
  while (current <= end) {
    days.push(new Date(current));
    current += DAY_MS;
  }
  return days;
}

function parseAmount(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula la tendencia de ingresos diarios a partir de pedidos crudos.
 * Genera un punto por cada día del rango (día con cero ingresos incluido).
 */
export function computeDailyRevenue(
  orders: OrderAnalyticsRow[],
  startDate: string,
  endDate: string,
): RevenueDataPoint[] {
  const dayDates = computeDayRange(startDate, endDate);
  const byDate = new Map<string, number>();
  for (const day of dayDates) {
    const key = toLocalDateKey(day);
    byDate.set(key, 0);
  }

  for (const order of orders) {
    const key = toLocalDateKey(new Date(order.created_at));
    const current = byDate.get(key);
    if (current !== undefined) {
      byDate.set(key, current + parseAmount(order.total_amount));
    }
  }

  return dayDates.map((day) => {
    const key = toLocalDateKey(day);
    return { date: key, revenue: byDate.get(key) ?? 0 };
  });
}

/**
 * Calcula el desglose de pedidos por grupo de estado a partir de pedidos crudos.
 */
export function computeStatusBreakdown(
  orders: OrderAnalyticsRow[],
): StatusBreakdownItem[] {
  const counts: Record<string, number> = {};
  for (const group of STATUS_GROUPS) {
    counts[group.key] = 0;
  }

  for (const order of orders) {
    for (const group of STATUS_GROUPS) {
      if (group.statuses.includes(order.status)) {
        counts[group.key] += 1;
        break;
      }
    }
  }

  return STATUS_GROUPS.map((group) => ({
    status: group.key,
    label: group.label,
    count: counts[group.key],
    color: group.color,
  }));
}

/**
 * Obtiene los pedidos de un comercio dentro de un rango de fechas para
 * construir las gráficas. Sólo lectura: respeta las políticas RLS de Supabase.
 */
export async function fetchMerchantOrdersForAnalytics(
  merchantId: string,
  startDate: string,
  endDate: string,
): Promise<OrderAnalyticsRow[]> {
  if (merchantId.trim() === '') {
    throw new Error('Se requiere el identificador del comercio.');
  }

  const start = `${startDate}T00:00:00.000Z`;
  const end = `${endDate}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .select('created_at, total_amount, status')
    .eq('merchant_id', merchantId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  if (error !== null) {
    throw new Error(
      `Error al obtener órdenes para análisis: ${error.message}`,
    );
  }
  return (data ?? []) as OrderAnalyticsRow[];
}

/**
 * Obtiene y calcula las analíticas de un comercio dentro del rango de fechas.
 * Combina la tendencia de ingresos diarios y el desglose por estado de pedido.
 */
export async function fetchMerchantAnalytics(
  merchantId: string,
  startDate: string,
  endDate: string,
): Promise<MerchantAnalytics> {
  const orders = await fetchMerchantOrdersForAnalytics(merchantId, startDate, endDate);
  return {
    dailyRevenue: computeDailyRevenue(orders, startDate, endDate),
    statusBreakdown: computeStatusBreakdown(orders),
  };
}
