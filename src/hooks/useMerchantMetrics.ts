import { useQuery } from '@tanstack/react-query';
import {
  computeMerchantMetrics,
  fetchMerchantOrders,
  type MerchantMetrics,
} from '../services/merchantMetricsService';

export interface UseMerchantMetricsResult {
  metrics: MerchantMetrics | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Consulta los pedidos de un comercio y calcula sus métricas resumidas.
 * La query sólo se ejecuta cuando `enabled` es true (p.ej. cuando el modal
 * de métricas está abierto), evitando fetches innecesarios.
 */
export function useMerchantMetrics(
  merchantId: string,
  enabled: boolean,
): UseMerchantMetricsResult {
  const { data, isError, error, isLoading } = useQuery<MerchantMetrics, Error>({
    queryKey: ['merchantMetrics', merchantId],
    queryFn: async () => {
      const orders = await fetchMerchantOrders(merchantId);
      return computeMerchantMetrics(orders);
    },
    enabled,
    staleTime: 60_000,
    gcTime: 0,
  });

  return {
    metrics: data ?? null,
    isLoading,
    error: isError
      ? error instanceof Error
        ? error.message
        : String(error)
      : null,
  };
}

export default useMerchantMetrics;
