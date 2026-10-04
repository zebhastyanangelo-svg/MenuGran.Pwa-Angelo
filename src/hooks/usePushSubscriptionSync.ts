/**
 * Hook de reconciliación de la suscripción Web Push.
 *
 * Al entrar a la app comprueba que la suscripción del navegador siga siendo
 * válida y, si el registro en Supabase falta, quedó inactivo o apunta a una
 * clave VAPID rotada, lo re-suscribe/actualiza sin volver a pedir permiso.
 *
 * Es la contraparte del lado cliente de la eliminación de suscripciones que
 * hace la Edge Function ante un 404/410.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { reconcilePushSubscription } from '../services/pushNotificationService';

export function usePushSubscriptionSync(): void {
  const { user } = useAuth();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user === null) {
      syncedUserIdRef.current = null;
      return;
    }

    // Solo una pasada por sesión de usuario: evita reintentos en cada render.
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    void reconcilePushSubscription(user.id);
  }, [user]);
}
