/**
 * Programador de recordatorios temporizados de pedidos.
 *
 * Mientras el tracker de un pedido está montado (aunque la pestaña esté en
 * segundo plano), programa con `setTimeout` el recordatorio del estado
 * actual y lo dispara solo si el pedido sigue en ese mismo estado. El aviso
 * se muestra vía Service Worker —persistente, visible con la pantalla
 * bloqueada— y se replica por Web Push al resto de dispositivos.
 */

import { useEffect, useRef } from 'react';
import type { OrderStatus } from '../types/database';
import {
  getReminderRuleForStatus,
  reminderDelayMs,
  type OrderReminderRule,
} from '../utils/orderReminders';

export interface ScheduledReminder extends OrderReminderRule {
  orderId: string;
}

export interface UseOrderReminderOptions {
  orderId: string | null;
  status: OrderStatus | null;
  /** Se dispara cuando vence el temporizador y el estado sigue siendo el mismo. */
  onReminder: (reminder: ScheduledReminder) => void;
  /** Reloj inyectable para pruebas. */
  setTimeoutFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (timer: ReturnType<typeof setTimeout>) => void;
}

const defaultSetTimeout: NonNullable<UseOrderReminderOptions['setTimeoutFn']> = (callback, delayMs) =>
  setTimeout(callback, delayMs);

const defaultClearTimeout: NonNullable<UseOrderReminderOptions['clearTimeoutFn']> = (timer) =>
  clearTimeout(timer);

export function useOrderReminderScheduler({
  orderId,
  status,
  onReminder,
  setTimeoutFn = defaultSetTimeout,
  clearTimeoutFn = defaultClearTimeout,
}: UseOrderReminderOptions): void {
  const onReminderRef = useRef(onReminder);
  onReminderRef.current = onReminder;

  useEffect(() => {
    if (orderId === null || status === null) return undefined;

    const rule = getReminderRuleForStatus(status);
    if (rule === null) return undefined;

    const timer = setTimeoutFn(() => {
      // Si el estado cambió mientras tanto, el cleanup ya canceló este
      // temporizador: llegar aquí significa que el pedido sigue igual.
      onReminderRef.current({ ...rule, orderId });
    }, reminderDelayMs(rule));

    return () => {
      clearTimeoutFn(timer);
    };
  }, [orderId, status, setTimeoutFn, clearTimeoutFn]);
}
