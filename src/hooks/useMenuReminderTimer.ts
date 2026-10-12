/**
 * Temporizador local de recordatorios de menú ("Es hora de comer").
 *
 * Revisa cada 15 minutos (y al montar) si toca lanzar un recordatorio según
 * la franja horaria. Es el refuerzo en la app del Background Periodic Sync
 * del service worker: cubre navegadores sin `periodicSync` y sesiones con la
 * pestaña abierta. Solo actúa con el permiso de notificaciones concedido.
 */

import { useEffect } from 'react';
import {
  getPendingMenuReminder,
  markMenuReminderShown,
  MENU_REMINDER_CHECK_INTERVAL_MS,
  showMenuReminderNotification,
  buildMenuReminderDateKey,
} from '../utils/menuReminders';

/** Un tick del temporizador: decide, muestra y marca la franja como mostrada. */
export async function runMenuReminderTick(now: Date = new Date()): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;

  const pending = getPendingMenuReminder(now);
  if (pending === null) return false;

  const shown = await showMenuReminderNotification(pending);
  if (shown) {
    markMenuReminderShown(buildMenuReminderDateKey(now), pending.slot);
  }
  return shown;
}

/** Monta el temporizador de recordatorios de retención mientras la app está abierta. */
export function useMenuReminderTimer(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined;
    if (Notification.permission !== 'granted') return undefined;

    let cancelled = false;
    const tick = (): void => {
      if (cancelled) return;
      void runMenuReminderTick().catch((error: unknown) => {
        console.warn('[menu-reminders] fallo del tick de recordatorio:', error);
      });
    };

    tick();
    const intervalId = window.setInterval(tick, MENU_REMINDER_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);
}
