import { useQuery } from '@tanstack/react-query';
import {
  fetchMerchantRatingSummary,
  fetchMerchantRatingsMap,
  type RatingSummary,
} from '../services/orderRatingService';

export interface UseMerchantPopularityResult {
  summary: RatingSummary | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Resumen de valoraciones (popularidad) de un comercio.
 *
 * Alimenta el medidor de popularidad del panel del dueño y las métricas del
 * superadmin. La query solo corre cuando `enabled` (p. ej. con la página
 * montada) y se cachea 1 minuto para no repetir consultas.
 */
export function useMerchantPopularity(
  merchantId: string | null,
  enabled = true,
): UseMerchantPopularityResult {
  const { data, isLoading, isError, error } = useQuery<RatingSummary, Error>({
    queryKey: ['merchantPopularity', merchantId],
    enabled: merchantId !== null && merchantId !== '' && enabled,
    staleTime: 60_000,
    queryFn: async () => fetchMerchantRatingSummary(merchantId as string),
  });

  return {
    summary: data ?? null,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
  };
}

/**
 * Mapa de resumen de valoraciones por comercio para el marketplace.
 *
 * Una sola consulta agrupa las estrellas de todos los comercios y alimenta
 * los badges de reputación de las tarjetas; el cliente ve la valoración
 * promedio que impacta la visibilidad del restaurante.
 */
export function useMarketplaceMerchantRatings(): Record<string, RatingSummary> {
  const { data } = useQuery<Record<string, RatingSummary>, Error>({
    queryKey: ['marketplaceMerchantRatings'],
    staleTime: 60_000,
    queryFn: fetchMerchantRatingsMap,
  });

  return data ?? {};
}
