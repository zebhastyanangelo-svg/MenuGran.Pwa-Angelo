import { useEffect, useState, useCallback, useRef } from 'react';
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
 * Hook para obtener y mantener actualizada la tasa de cambio BCV desde
 * DolarVZLA (https://rates.dolarvzla.com/bcv/current.json).
 * Es la fuente central de la tasa para toda la app (Checkout, carrito,
 * paneles de comercio y admin). Usa caché en memoria/localStorage con TTL
 * de 1 hora y deduplica peticiones concurrentes a la API; `main.tsx`
 * mantiene además un refresco automático cada hora y al recuperar el foco.
 */
export function useExchangeRate(): UseExchangeRateReturn {
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const applyCacheMetadata = useCallback(() => {
    const cached = getCachedExchangeRate();
    if (cached) {
      setLastUpdated(new Date(cached.timestamp));
      setSource(cached.source);
    }
  }, []);

  const loadRate = useCallback(async () => {
    try {
      setError(null);

      const cached = getCachedExchangeRate();
      if (cached) {
        setRate(cached.rate);
        applyCacheMetadata();
      }

      const currentRate = await getBCVRate();
      if (!isMountedRef.current) return;
      setRate(currentRate);
      applyCacheMetadata();
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Error al obtener tasa de cambio';
      setError(message);
      console.error('[useExchangeRate]', message);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [applyCacheMetadata]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadRate();
  }, [loadRate]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadRate();
    return () => {
      isMountedRef.current = false;
    };
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
 * Retorna 0 durante la carga inicial si no hay caché.
 */
export function useBCVRate(): number {
  const { rate, isLoading } = useExchangeRate();

  if (isLoading && rate === null) {
    return 0;
  }

  return rate ?? 0;
}