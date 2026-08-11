import { useCallback, useEffect, useState } from 'react';
import type { OrderStatus } from '../types/database';

export type PermissionState = 'default' | 'granted' | 'denied';

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
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

  const showNotification = useCallback(
    (payload: NotificationPayload): void => {
      if (!isSupported) {
        return;
      }
      if (permission !== 'granted') {
        return;
      }
      try {
        const { title, body, tag, data } = payload;
        new Notification(title, { body, tag, data });
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
