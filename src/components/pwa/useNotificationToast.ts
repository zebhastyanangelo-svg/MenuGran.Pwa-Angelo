import { useContext } from 'react';
import {
  NotificationToastContext,
  type NotificationToastContextValue,
} from './notification-toast-context';

export function useNotificationToast(): NotificationToastContextValue {
  const context = useContext(NotificationToastContext);

  if (context === null) {
    throw new Error(
      'useNotificationToast debe usarse dentro de un NotificationToastProvider',
    );
  }

  return context;
}
