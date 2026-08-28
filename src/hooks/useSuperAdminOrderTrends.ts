import { useQuery } from '@tanstack/react-query';
import {
  computeRevenueTrend,
  computeOrderStatusTrend,
  fetchOrdersForTrends,
  type RevenueTrendPoint,
  type OrderStatusTrend,
  type OrderTrendRaw,
} from '../services/superAdminOrderTrendsService';

export interface UseSuperAdminOrderTrendsResult {
  revenueTrend: RevenueTrendPoint[];
  ordersStatusTrend: OrderStatusTrend[];
  isLoading: boolean;
  error: string | null;
}

function buildTrends(raw: OrderTrendRaw[], days: number) {
  return {
    revenueTrend: computeRevenueTrend(raw, days),
    ordersStatusTrend: computeOrderStatusTrend(raw, days),
  };
}

/**
 * Consulta los pedidos de los últimos `days` días y deriva las tendencias de
 * ingresos y estados de pedido para el dashboard del Super Admin.
 *
 * La agregación se realiza en cliente (funciones puras testeables) manteniendo
 * la base de datos libre de lógica de presentación.
 */
export function useSuperAdminOrderTrends(
  days: number = 30,
): UseSuperAdminOrderTrendsResult {
  const { data, isError, error, isLoading } = useQuery<{
    revenueTrend: RevenueTrendPoint[];
    ordersStatusTrend: OrderStatusTrend[];
  }>({
    queryKey: ['superAdminOrderTrends', days],
    queryFn: async () => {
      const orders = await fetchOrdersForTrends(days);
      return buildTrends(orders, days);
    },
    staleTime: 60_000,
    gcTime: 0,
  });

  return {
    revenueTrend: data?.revenueTrend ?? [],
    ordersStatusTrend: data?.ordersStatusTrend ?? [],
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
  };
}

export default useSuperAdminOrderTrends;
