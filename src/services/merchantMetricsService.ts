import { supabase, TABLE_NAMES } from './supabase';
import type { OrderStatus } from '../types/database';

export interface MerchantOrderRow {
  id: string;
  status: OrderStatus;
  total_amount: string;
  created_at: string;
}

export type ActivityLevel = 'Alta' | 'Media' | 'Baja' | 'Inactivo';

export interface MerchantMetrics {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageTicket: number;
  activityLevel: ActivityLevel;
  ordersLast30Days: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isWithinLastDays(
  createdAt: string,
  now: Date,
  daysMs: number,
): boolean {
  const elapsed = now.getTime() - new Date(createdAt).getTime();
  return elapsed >= 0 && elapsed <= daysMs;
}

function deriveActivityLevel(ordersLast30Days: number): ActivityLevel {
  if (ordersLast30Days === 0) return 'Inactivo';
  if (ordersLast30Days >= 20) return 'Alta';
  if (ordersLast30Days >= 5) return 'Media';
  return 'Baja';
}

/**
 * Calcula las métricas de negocio a partir de los pedidos crudos de un comercio.
 *
 * - Ingresos procesados: suma de `total_amount` de pedidos entregados.
 * - Ticket promedio: ingresos procesados / pedidos completados.
 * - Nivel de actividad: basado en pedidos de los últimos 30 días.
 */
export function computeMerchantMetrics(
  orders: MerchantOrderRow[],
  now: Date = new Date(),
): MerchantMetrics {
  const totalOrders = orders.length;
  const completed = orders.filter((o) => o.status === 'delivered');
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const completedOrders = completed.length;
  const cancelledOrders = cancelled.length;
  const totalRevenue = completed.reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0,
  );
  const averageTicket =
    completedOrders > 0 ? totalRevenue / completedOrders : 0;
  const ordersLast30Days = orders.filter((o) =>
    isWithinLastDays(o.created_at, now, THIRTY_DAYS_MS),
  ).length;
  return {
    totalRevenue,
    totalOrders,
    completedOrders,
    cancelledOrders,
    averageTicket,
    activityLevel: deriveActivityLevel(ordersLast30Days),
    ordersLast30Days,
  };
}

/**
 * Obtiene los pedidos (select estándar) de un comercio para cálculo de métricas.
 * Sólo lectura: respeta las políticas RLS de Supabase.
 */
export async function fetchMerchantOrders(
  merchantId: string,
): Promise<MerchantOrderRow[]> {
  if (merchantId.trim() === '') {
    throw new Error('Se requiere el identificador del comercio.');
  }
  const { data, error } = await supabase
    .from(TABLE_NAMES.orders)
    .select('id, status, total_amount, created_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error !== null) {
    throw new Error(
      `Error al obtener pedidos del comercio: ${error.message}`,
    );
  }
  return (data ?? []) as MerchantOrderRow[];
}
