/**
 * Reglas de recordatorios temporizados de pedidos.
 *
 * Un recordatorio es un aviso programado que se dispara cuando un pedido
 * permanece demasiado tiempo en un estado que requiere acción del cliente
 * (pagar, retirar, confirmar). Se muestra a través del Service Worker —visible
 * en la pantalla de bloqueo y con la app en segundo plano— y se replica por
 * Web Push al resto de dispositivos del usuario.
 */

import type { OrderStatus } from '../types/database';

export interface OrderReminderRule {
  /** Estado que debe seguir activo para que el recordatorio proceda. */
  status: OrderStatus;
  /** Minutos que el pedido lleva en ese estado antes de alertar. */
  delayMinutes: number;
  title: string;
  body: string;
}

export const ORDER_REMINDER_RULES: readonly OrderReminderRule[] = [
  {
    status: 'payment_pending',
    delayMinutes: 15,
    title: 'Recordatorio de pago',
    body: 'Tu pedido sigue pendiente de pago. Confírmalo para que el comercio empiece a prepararlo.',
  },
  {
    status: 'confirmed',
    delayMinutes: 20,
    title: '¿Ya retiraste tu pedido?',
    body: 'Tu pedido confirmado está esperando novedades. Revisa su estado en la app.',
  },
  {
    status: 'ready',
    delayMinutes: 10,
    title: 'Tu pedido está listo',
    body: 'Tu pedido sigue listo para retirar. Pasa por el comercio antes de que se enfríe.',
  },
];

/** Convierte los minutos de una regla al delay en milisegundos del temporizador. */
export function reminderDelayMs(rule: OrderReminderRule): number {
  return rule.delayMinutes * 60_000;
}

/** Regla de recordatorio vigente para un estado, o `null` si no aplica. */
export function getReminderRuleForStatus(status: OrderStatus): OrderReminderRule | null {
  return ORDER_REMINDER_RULES.find((rule) => rule.status === status) ?? null;
}

/**
 * Estados que "congelan" el recordatorio: si el pedido avanzó a otro estado
 * (o ya terminó), el temporizador previo se cancela y no vuelve a alertar.
 */
export function isReminderStillRelevant(
  scheduledStatus: OrderStatus,
  currentStatus: OrderStatus,
): boolean {
  return scheduledStatus === currentStatus;
}
