/**
 * Alertas de suscripciones para el SuperAdmin.
 *
 * Consulta los comercios con `subscription_expires_at` vencido o próximo a
 * vencer (≤ 7 días) y los re-evalúa cada 15 minutos mientras el dashboard
 * está abierto, de modo que un comercio que venza durante la sesión genera
 * la alerta sin recargar.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchMerchantsWithSubscriptionIssues,
  type MerchantSubscriptionIssue,
} from '../services/superAdminService';

/** Intervalo de re-verificación de suscripciones en el dashboard. */
export const SUBSCRIPTION_ALERTS_REFRESH_MS = 15 * 60 * 1000;

export interface UseSubscriptionAlertsResult {
  issues: MerchantSubscriptionIssue[];
  isLoading: boolean;
  error: string | null;
}

export function useSubscriptionAlerts(): UseSubscriptionAlertsResult {
  const { data, isLoading, isError, error } = useQuery<
    MerchantSubscriptionIssue[],
    Error
  >({
    queryKey: ['superAdminSubscriptionAlerts'],
    queryFn: async (): Promise<MerchantSubscriptionIssue[]> =>
      fetchMerchantsWithSubscriptionIssues(),
    refetchInterval: SUBSCRIPTION_ALERTS_REFRESH_MS,
    staleTime: SUBSCRIPTION_ALERTS_REFRESH_MS,
  });

  return {
    issues: data ?? [],
    isLoading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
  };
}
