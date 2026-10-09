import { useCallback, useEffect, useState } from 'react';
import type { OrderStatus } from '../types/database';

export type PermissionState = 'default' | 'granted' | 'denied';

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  /** Ruta interna a la que abre el clic cuando la notificación sale del SW. */
  url?: string;
  /**
   * Muestra el aviso como recordatorio activo: persistente en pantalla,
   * con vibración y re-alerta sobre la notificación previa del mismo tag.
   */
  reminder?: boolean;
}

export interface UseNotificationsResult {
  permission: PermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<PermissionState>;
  showNotification: (payload: NotificationPayload) => void;
}

const ORDER_STATUS_TITLES: Record<OrderStatus, string> = {
  payment_pending: 'Pedido pendiente',
  confirmed: 'Pedido confirmado',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Pedido cancelado',
};

const ORDER_STATUS_BODIES: Record<OrderStatus, string> = {
  payment_pending: 'Tu pago aún no ha sido confirmado.',
  confirmed: 'El comercio ha confirmado tu pedido.',
  preparing: 'Tu pedido está siendo preparado.',
  ready: 'Tu pedido está listo. Puedes pasar a recogerlo.',
  on_the_way: 'Tu pedido está en camino.',
  delivered: 'Tu pedido ha sido entregado.',
  cancelled: 'Tu pedido ha sido cancelado.',
};

/** Vibración de los recordatorios activos (patrón doble, tipo alarma). */
const REMINDER_VIBRATION_PATTERN: readonly number[] = [300, 150, 300];

/**
 * Opciones de notificación extendidas.
 *
 * `renotify`, `vibrate` o `silent` no están en el `NotificationOptions` de
 * lib.dom (pertenecen a las notificaciones del Service Worker), pero los
 * navegadores las aceptan tanto en `registration.showNotification` como en el
 * constructor. Se declara el contrato propio y se amolda al llamar.
 */
export interface ReminderNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  vibrate?: number[];
  silent?: boolean;
}

function getBrowserPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission as PermissionState;
}

function getIsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function buildOrderNotification(status: OrderStatus): NotificationPayload {
  const title = ORDER_STATUS_TITLES[status];
  const body = ORDER_STATUS_BODIES[status];
  return {
    title,
    body,
    tag: 'order-status-update',
    data: { status },
  };
}

/**
 * Traduce el payload del hook a las opciones que espera
 * `showNotification` (del SW o del constructor `Notification`).
 *
 * Los recordatorios se muestran persistentes y vibrando; el resto mantiene el
 * comportamiento discreto de siempre.
 */
export function buildDisplayOptions(payload: NotificationPayload): ReminderNotificationOptions {
  const data: Record<string, unknown> = { ...payload.data };
  if (payload.url !== undefined) {
    data.url = payload.url;
  }

  const options: ReminderNotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    renotify: false,
    requireInteraction: false,
    data,
  };

  if (payload.reminder === true) {
    options.renotify = true;
    options.requireInteraction = true;
    options.silent = false;
    options.vibrate = [...REMINDER_VIBRATION_PATTERN];
  }

  return options;
}

export function useNotifications(): UseNotificationsResult {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSupported] = useState<boolean>(getIsSupported);

  useEffect(() => {
    setPermission(getBrowserPermission());
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) {
      return 'default';
    }
    try {
      const result = await Notification.requestPermission();
      const resolved = result as PermissionState;
      setPermission(resolved);
      return resolved;
    } catch (err) {
      console.error('Error al solicitar permiso de notificaciones:', err);
      return 'default';
    }
  }, [isSupported]);

  /**
   * Muestra la notificación preferentemente a través del Service Worker.
   *
   * Las notificaciones del SW son las que aparecen en la pantalla de bloqueo y
   * sobreviven a que la pestaña pase a segundo plano; el constructor
   * `new Notification()` queda solo como fallback para navegadores sin SW
   * (y para entornos de pruebas).
   */
  const showNotification = useCallback(
    (payload: NotificationPayload): void => {
      if (!isSupported) {
        return;
      }
      if (permission !== 'granted') {
        return;
      }

      const options = buildDisplayOptions(payload);

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          void navigator.serviceWorker.ready
            .then((registration) =>
              registration.showNotification(payload.title, options as NotificationOptions),
            )
            .catch((err: unknown) => {
              console.error('Error al mostrar notificación vía Service Worker:', err);
            });
          return;
        } catch (err) {
          console.error('Error al preparar el Service Worker:', err);
        }
      }

      try {
        new Notification(payload.title, options as NotificationOptions);
      } catch (err) {
        console.error('Error al mostrar notificación:', err);
      }
    },
    [isSupported, permission],
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  };
}
