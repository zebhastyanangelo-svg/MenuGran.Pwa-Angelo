import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildMenuReminderCopy,
  buildMenuReminderDateKey,
  getPendingMenuReminder,
  markMenuReminderShown,
  MENU_REMINDER_STORAGE_KEY,
  readShownMenuReminders,
  resolveMenuReminderSlot,
} from './menuReminders';

describe('buildMenuReminderCopy', () => {
  it('usa el copy de desayuno en la franja de la mañana', () => {
    const copy = buildMenuReminderCopy(9);
    expect(copy.title).toContain('Buenos días');
    expect(copy.body).toContain('desayunar');
  });

  it('usa el copy de almuerzo al mediodía', () => {
    expect(buildMenuReminderCopy(12).title).toContain('almorzar');
  });

  it('usa el copy de cena por la noche', () => {
    expect(buildMenuReminderCopy(19).title).toContain('cenar');
  });
});

describe('resolveMenuReminderSlot', () => {
  it('devuelve el slot activo por franja', () => {
    expect(resolveMenuReminderSlot(9)).toBe(9);
    expect(resolveMenuReminderSlot(11)).toBe(9);
    expect(resolveMenuReminderSlot(12)).toBe(12);
    expect(resolveMenuReminderSlot(14)).toBe(12);
    expect(resolveMenuReminderSlot(19)).toBe(19);
    expect(resolveMenuReminderSlot(20)).toBe(19);
  });

  it('devuelve null en madrugada y noche avanzada', () => {
    for (const hour of [0, 3, 4, 21, 23]) {
      expect(resolveMenuReminderSlot(hour)).toBeNull();
    }
  });

  it('devuelve null para horas inválidas', () => {
    expect(resolveMenuReminderSlot(-1)).toBeNull();
    expect(resolveMenuReminderSlot(24)).toBeNull();
    expect(resolveMenuReminderSlot(9.5)).toBeNull();
  });
});

describe('registro de franjas mostradas', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('devuelve registro vacío sin datos guardados', () => {
    expect(readShownMenuReminders()).toEqual({});
  });

  it('marca y lee una franja mostrada por día', () => {
    const dateKey = '2026-10-12';
    markMenuReminderShown(dateKey, 12);

    expect(readShownMenuReminders()).toEqual({ '2026-10-12': [12] });
  });

  it('no duplica la franja si se marca dos veces', () => {
    const dateKey = '2026-10-12';
    markMenuReminderShown(dateKey, 12);
    markMenuReminderShown(dateKey, 12);

    expect(readShownMenuReminders()[dateKey]).toEqual([12]);
  });

  it('podas días antiguos al guardar', () => {
    markMenuReminderShown('2026-10-09', 9);
    markMenuReminderShown('2026-10-10', 9);
    markMenuReminderShown('2026-10-11', 9);
    markMenuReminderShown('2026-10-12', 12);

    const log = readShownMenuReminders();
    expect(log['2026-10-09']).toBeUndefined();
    expect(log['2026-10-12']).toEqual([12]);
  });
});

describe('getPendingMenuReminder', () => {
  const testDate = new Date(2026, 9, 12, 13, 30);
  const dateKey = buildMenuReminderDateKey(testDate);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('devuelve el recordatorio cuando la franja de hoy no se mostró', () => {
    const pending = getPendingMenuReminder(testDate);
    expect(pending).not.toBeNull();
    expect(pending?.slot).toBe(12);
    expect(pending?.copy.title).toContain('almorzar');
  });

  it('devuelve null cuando la franja ya se mostró hoy', () => {
    markMenuReminderShown(dateKey, 12);
    expect(getPendingMenuReminder(testDate)).toBeNull();
  });

  it('permite la misma franja en otro día distinto', () => {
    window.localStorage.setItem(MENU_REMINDER_STORAGE_KEY, JSON.stringify({ '2026-10-11': [12] }));
    const pending = getPendingMenuReminder(testDate);
    expect(pending?.slot).toBe(12);
  });

  it('devuelve null fuera de las franjas de comida', () => {
    expect(getPendingMenuReminder(new Date(2026, 9, 12, 3, 0))).toBeNull();
    expect(getPendingMenuReminder(new Date(2026, 9, 12, 22, 0))).toBeNull();
  });
});
