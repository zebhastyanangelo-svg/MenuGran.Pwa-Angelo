import { useQuery } from '@tanstack/react-query'
import {
  fetchSuperAdminMetrics,
  type SuperAdminMetrics,
} from '../services/superAdminMetricsService'

export interface UseSuperAdminMetricsResult {
  metrics: SuperAdminMetrics | null
  isLoading: boolean
  error: string | null
}

export function useSuperAdminMetrics(): UseSuperAdminMetricsResult {
  const { data, isError, error, isLoading } = useQuery<
    SuperAdminMetrics,
    Error
  >({
    queryKey: ['superAdminMetrics'],
    queryFn: async () => fetchSuperAdminMetrics(),
  })

  return {
    metrics: data ?? null,
    isLoading: isLoading || isError,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
  }
}

export default useSuperAdminMetrics