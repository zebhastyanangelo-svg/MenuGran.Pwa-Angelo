import { useQuery } from '@tanstack/react-query';
import {
  fetchMerchantDeliveryMetrics,
  type MerchantDeliveryMetrics,
} from '../services/orderRatingService';

export interface UseMerchantDeliveryMetricsResult {
  metrics: MerchantDeliveryMetrics | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Métricas de calificaciones de delivery de un comercio: estrellas por
 * repartidor y resumen global del equipo. Se cachea 1 minuto para no
 * repetir consultas mientras el panel está abierto.
 */
export function useMerchantDeliveryMetrics(
  merchantId: string | null,
  enabled = true,
): UseMerchantDeliveryMetricsResult {
  const { data, isLoading, isError, error } = useQuery<MerchantDeliveryMetrics, Error>({
    queryKey: ['merchantDeliveryMetrics', merchantId],
    enabled: merchantId !== null && merchantId !== '' && enabled,
    staleTime: 60_000,
    queryFn: async () => fetchMerchantDeliveryMetrics(merchantId as string),
  });

  return {
    metrics: data ?? null,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
  };
}
