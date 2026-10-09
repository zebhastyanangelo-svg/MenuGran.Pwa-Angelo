import { describe, expect, it } from 'vitest';
import {
  ORDER_REMINDER_RULES,
  getReminderRuleForStatus,
  isReminderStillRelevant,
  reminderDelayMs,
} from './orderReminders';
import type { OrderStatus } from '../types/database';

describe('ORDER_REMINDER_RULES', () => {
  it('define reglas para los estados que requieren acción del cliente', () => {
    const statuses = ORDER_REMINDER_RULES.map((rule) => rule.status);

    expect(statuses).toContain('payment_pending');
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('ready');
  });

  it('cada regla tiene título, cuerpo y delay positivos', () => {
    for (const rule of ORDER_REMINDER_RULES) {
      expect(rule.title.length).toBeGreaterThan(0);
      expect(rule.body.length).toBeGreaterThan(0);
      expect(rule.delayMinutes).toBeGreaterThan(0);
    }
  });
});

describe('getReminderRuleForStatus', () => {
  it('devuelve la regla del estado pedido', () => {
    const rule = getReminderRuleForStatus('payment_pending');

    expect(rule).not.toBeNull();
    expect(rule?.status).toBe('payment_pending');
  });

  it('devuelve null para estados sin recordatorio', () => {
    const withoutReminder: OrderStatus[] = [
      'preparing',
      'on_the_way',
      'delivered',
      'cancelled',
    ];

    for (const status of withoutReminder) {
      expect(getReminderRuleForStatus(status)).toBeNull();
    }
  });
});

describe('reminderDelayMs', () => {
  it('convierte minutos a milisegundos', () => {
    expect(reminderDelayMs({ status: 'ready', delayMinutes: 10, title: 't', body: 'b' })).toBe(
      600_000,
    );
  });
});

describe('isReminderStillRelevant', () => {
  it('solo es relevante si el estado programado sigue vigente', () => {
    expect(isReminderStillRelevant('payment_pending', 'payment_pending')).toBe(true);
    expect(isReminderStillRelevant('payment_pending', 'confirmed')).toBe(false);
  });
});
