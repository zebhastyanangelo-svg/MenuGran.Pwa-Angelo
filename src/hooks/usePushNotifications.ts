/**
 * Hook de entrada de la PWA para permisos y suscripción Web Push.
 *
 * Se monta en el punto de entrada principal (App.tsx) y, al cargar la app con
 * un usuario autenticado:
 *  1. Solicita de inmediato el permiso de notificaciones cuando aún está en
 *     `default` (una sola vez por sesión de pestaña).
 *  2. Con el permiso concedido, obtiene la suscripción VAPID del navegador y
 *     la guarda/actualiza en `user_push_subscriptions` (con el rol).
 *  3. Registra Background Periodic Sync (`menugram-reminders`) para los
 *     recordatorios de menú; los horarios exactos (9:00 / 12:00 / 19:00)
 *     los garantiza el Web Push programado del backend.
 *
 * Si el permiso ya fue denegado no se vuelve a pedir (el navegador lo
 * bloquea): el onboarding y la configuración del SO quedan como única vía.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import {
  isPushSupported,
  subscribeCurrentUserToPush,
  type SubscribePushResult,
} from '../services/pushNotificationService';

/** Marca de "ya se pidió el permiso en esta sesión de pestaña". */
const SESSION_ASKED_KEY = 'menugram-push-auto-asked';

/** Tag de Periodic Sync para los recordatorios de menú. */
export const MENU_REMINDER_PERIODIC_SYNC_TAG = 'menugram-reminders';

export type PushSetupStatus =
  | 'unsupported'
  | 'idle'
  | 'granted'
  | 'denied'
  | 'error';

/** PeriodicSync no está en todas las lib.dom: contrato mínimo necesario. */
interface ServiceWorkerRegistrationWithPeriodicSync
  extends ServiceWorkerRegistration {
  periodicSync?: {
    getTags?: () => Promise<string[]>;
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
}

function readSessionAsked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_ASKED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeSessionAsked(): void {
  try {
    sessionStorage.setItem(SESSION_ASKED_KEY, 'true');
  } catch {
    // sessionStorage bloqueado (modo privado estricto): el guard del hook
    // (attemptedRef) sigue evitando pedidos repetidos en esta pestaña.
  }
}

/**
 * Registra el recordatorio periódico de menú en el navegador.
 *
 * Devuelve `false` cuando el navegador no soporta Periodic Sync o el
 * permiso no está concedido: los recordatorios igual llegan por Web Push
 * desde el backend, así que el fallo nunca es fatal.
 */
export async function registerMenuReminderPeriodicSync(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration =
      (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithPeriodicSync;
    const periodicSync = registration.periodicSync;
    if (periodicSync === undefined) return false;

    const registeredTags = await periodicSync.getTags?.().catch(() => [] as string[]);
    if (registeredTags !== undefined && registeredTags.includes(MENU_REMINDER_PERIODIC_SYNC_TAG)) {
      return true;
    }

    await periodicSync.register(MENU_REMINDER_PERIODIC_SYNC_TAG, {
      minInterval: 24 * 60 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export interface UsePushNotificationsResult {
  isSupported: boolean;
  status: PushSetupStatus;
  message: string | null;
  /** Reintenta el flujo manualmente (p. ej. desde un botón de configuración). */
  requestPermissionNow: () => Promise<SubscribePushResult | null>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<PushSetupStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const requestPushSetup = useCallback(
    async (userId: string, userRole?: string): Promise<SubscribePushResult | null> => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus(permission === 'denied' ? 'denied' : 'idle');
          return null;
        }

        const result = await subscribeCurrentUserToPush(userId, userRole);
        if (result.status === 'subscribed') {
          await registerMenuReminderPeriodicSync();
          setStatus('granted');
        } else if (result.status === 'denied') {
          setStatus('denied');
        } else if (result.status === 'error') {
          setStatus('error');
          setMessage(result.message);
        }
        return result;
      } catch (err) {
        setStatus('error');
        setMessage(
          err instanceof Error ? err.message : 'No se pudo activar las notificaciones.',
        );
        return null;
      }
    },
    [],
  );

  /** Reintento manual (p. ej. desde un botón de configuración). */
  const requestPermissionNow = useCallback((): Promise<SubscribePushResult | null> => {
    if (user === null) return Promise.resolve(null);
    return requestPushSetup(user.id, profile?.role ?? undefined);
  }, [user, profile?.role, requestPushSetup]);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }

    if (user === null) {
      // Nueva sesión/usuario: permite el intento automático del siguiente.
      attemptedRef.current = false;
      return;
    }

    const userRole = profile?.role ?? undefined;

    // Permiso ya concedido: sincroniza suscripción y recordatorios sin
    // volver a mostrar el prompt del navegador.
    if (Notification.permission === 'granted') {
      if (attemptedRef.current) return;
      attemptedRef.current = true;
      void (async () => {
        const result = await subscribeCurrentUserToPush(user.id, userRole);
        if (result.status === 'subscribed') {
          await registerMenuReminderPeriodicSync();
          setStatus('granted');
        } else if (result.status === 'error') {
          setStatus('error');
          setMessage(result.message);
        }
      })();
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Permiso pendiente (`default`): pedirlo de inmediato, una vez por sesión.
    if (readSessionAsked() || attemptedRef.current) return;
    attemptedRef.current = true;
    writeSessionAsked();
    void requestPushSetup(user.id, userRole);
  }, [user, profile?.role, requestPushSetup]);

  return {
    isSupported: isPushSupported(),
    status,
    message,
    requestPermissionNow,
  };
}
