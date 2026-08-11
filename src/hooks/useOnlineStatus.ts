import { useEffect, useState } from 'react';

/**
 * Resultado del hook de estado de red.
 */
export interface OnlineStatus {
  isOnline: boolean;
  isOffline: boolean;
}

function getInitialOnlineStatus(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Hook que detecta el estado de conectividad de red escuchando los eventos
 * nativos `online` / `offline` de la Window API y usando el valor inicial
 * de `navigator.onLine`.
 *
 * Es compatible con SSR (devuelve `true` cuando `window` no está disponible,
 * asumiendo conectividad por defecto en el servidor).
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineStatus);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = (): void => {
      setIsOnline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}
