import { useCallback, useEffect, useState } from 'react';
import {
  fetchSuperAdminMetrics,
  type SuperAdminMetrics,
} from '../services/superAdminMetricsService';

export interface UseSuperAdminMetricsResult {
  metrics: SuperAdminMetrics | null;
  isLoading: boolean;
  error: string | null;
}

/** Carga las métricas globales para el dashboard del Super Admin. */
export function useSuperAdminMetrics(): UseSuperAdminMetricsResult {
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchSuperAdminMetrics();
      setMetrics(data);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudieron cargar las métricas.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { metrics, isLoading, error };
}

export default useSuperAdminMetrics;
