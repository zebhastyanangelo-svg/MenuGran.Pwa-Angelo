/**
 * Hook de reconciliación de la suscripción Web Push.
 *
 * Al entrar a la app comprueba que la suscripción del navegador siga siendo
 * válida y, si el registro en Supabase falta, quedó inactivo o apunta a una
 * clave VAPID rotada, lo re-suscribe/actualiza sin volver a pedir permiso.
 *
 * Es la contraparte del lado cliente de la eliminación de suscripciones que
 * hace la Edge Function ante un 404/410 o un 401/403 por rotación de VAPID.
 *
 * La comprobación no se limita al montaje: se repite cuando el service worker
 * se actualiza (un bundle nuevo es justo cuando la clave VAPID pública puede
 * haber cambiado) y al volver a la pestaña tras un tiempo en segundo plano, que
 * es como una PWA abierta durante días se queda sin revalidar. Ambas rutas
 * pasan por un guardia de usuario y un intervalo mínimo para no repetir el
 * reconcile en cada `focus`.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { reconcilePushSubscription } from '../services/pushNotificationService';

/** Tiempo mínimo entre reconciliaciones triggered por volver a la pestaña. */
const REVALIDATE_THROTTLE_MS = 15 * 60 * 1000;

export function usePushSubscriptionSync(): void {
  const { user, profile } = useAuth();
  const syncedUserIdRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef(0);

  /** Reconcilia salvo que ya se haya hecho para este usuario hace nada. */
  const runSync = useCallback((): void => {
    if (user === null) return;
    if (syncedUserIdRef.current === user.id) return;

    syncedUserIdRef.current = user.id;
    lastSyncAtRef.current = Date.now();
    void reconcilePushSubscription(user.id, profile?.role ?? undefined);
  }, [user, profile?.role]);

  /** Reconcilia ignorando el guardia, para relanzar tras un update del SW. */
  const forceSync = useCallback((): void => {
    if (user === null) return;

    syncedUserIdRef.current = null;
    runSync();
  }, [user, runSync]);

  useEffect(() => {
    if (user === null) {
      syncedUserIdRef.current = null;
      lastSyncAtRef.current = 0;
      return;
    }

    runSync();
  }, [user, runSync]);

  useEffect(() => {
    if (user === null || typeof navigator === 'undefined') return undefined;
    // La clave puede existir y valer `undefined` (navegador sin soporte, entorno
    // de pruebas): leer `.ready` sobre eso lanzaría fuera de la cadena de
    // promesas y dejaría el efecto sin manejar.
    const serviceWorker = navigator.serviceWorker;
    if (typeof serviceWorker === 'undefined' || serviceWorker === null) return undefined;

    let registration: ServiceWorkerRegistration | undefined;
    let cancelled = false;

    const handleUpdateFound = (): void => {
      // El bundle recién instalado puede traer otra clave VAPID pública: la
      // suscripción atada a la anterior debe renovarse en cuanto el SW cambia.
      forceSync();
    };

    void serviceWorker.ready
      .then((ready) => {
        if (cancelled) return;
        registration = ready;
        registration.addEventListener('updatefound', handleUpdateFound);
      })
      .catch(() => {
        // Sin service worker activo no hay nada que revalidar.
      });

    return () => {
      cancelled = true;
      registration?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, [user, forceSync]);

  useEffect(() => {
    if (user === null || typeof document === 'undefined') return undefined;

    const currentUserId = user.id;
    const userRole = profile?.role;

    const runSyncThrottled = (): void => {
      if (syncedUserIdRef.current !== currentUserId) return;
      lastSyncAtRef.current = Date.now();
      void reconcilePushSubscription(currentUserId, userRole);
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) return;

      const elapsed = Date.now() - lastSyncAtRef.current;
      if (elapsed < REVALIDATE_THROTTLE_MS) return;

      runSyncThrottled();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, profile?.role]);
}