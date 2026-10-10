import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getBCVRate,
  getCachedExchangeRate,
  EXCHANGE_RATE_REFRESH_INTERVAL_MS,
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
 * paneles de comercio y admin). Usa caché efímera en memoria/localStorage
 * con TTL de 5 minutos, deduplica peticiones concurrentes a la API y
 * re-lee la tasa cada 5 minutos (polling) para que la UI refleje el valor
 * oficial exacto en tiempo real sin guardarlo en la base de datos.
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

    // Polling cada 5 minutos: re-lee la tasa (la caché la refresca el
    // poller global de main.tsx) para que los precios en vivo se actualicen
    // sin recargar la página.
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        void loadRate();
      }
    }, EXCHANGE_RATE_REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
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