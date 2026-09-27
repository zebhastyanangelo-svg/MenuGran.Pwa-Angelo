import { useEffect, useState, useCallback } from 'react';
import {
  getBCVRate,
  getCachedExchangeRate,
} from '../services/exchangeRate';

export interface UseExchangeRateReturn {
  rate: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
  source: string | null;
}

/**
 * Hook para obtener y mantener actualizada la tasa de cambio BCV.
 * Usa caché local y actualiza automáticamente en background.
 */
export function useExchangeRate(): UseExchangeRateReturn {
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const loadRate = useCallback(async () => {
    try {
      setError(null);

      // Primero mostrar la caché inmediatamente si existe
      const cached = getCachedExchangeRate();
      if (cached) {
        setRate(cached.rate);
        setLastUpdated(new Date(cached.timestamp));
        setSource(cached.source);
      }

      // Luego obtener la tasa actualizada (puede usar caché o API)
      const currentRate = await getBCVRate();
      setRate(currentRate);

      // Actualizar metadata de la caché fresca
      const freshCache = getCachedExchangeRate();
      if (freshCache) {
        setLastUpdated(new Date(freshCache.timestamp));
        setSource(freshCache.source);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener tasa de cambio';
      setError(message);
      console.error('[useExchangeRate]', message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadRate();
  }, [loadRate]);

  useEffect(() => {
    loadRate();
  }, [loadRate]);

  return {
    rate,
    isLoading,
    error,
    refresh,
    lastUpdated,
    source,
  };
}

/**
 * Hook simplificado que solo retorna la tasa (útil para componentes que solo necesitan el valor).
 * Lanza durante la carga inicial si no hay caché.
 */
export function useBCVRate(): number {
  const { rate, isLoading } = useExchangeRate();

  if (isLoading && rate === null) {
    // Durante la carga inicial sin caché, retornamos 0 para evitar renderizado condicional complejo
    // El componente padre debería manejar el estado de carga
    return 0;
  }

  return rate ?? 0;
}