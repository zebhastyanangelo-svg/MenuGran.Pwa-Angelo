import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { checkAndNotifyNearbyMerchants } from '../services/geofencingService';

const GEOFENCING_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Hook para gestionar las notificaciones por proximidad (geofencing).
 *
 * Verifica periódicamente si el usuario está cerca de un comercio y
 * envía una notificación push si está dentro del radio configurado.
 */
export function useGeofencing(): void {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user === null) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkProximity = async () => {
      try {
        await checkAndNotifyNearbyMerchants();
      } catch {
        // Silently fail - geofencing is best-effort
      }
    };

    void checkProximity();

    intervalRef.current = setInterval(() => {
      void checkProximity();
    }, GEOFENCING_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
}
