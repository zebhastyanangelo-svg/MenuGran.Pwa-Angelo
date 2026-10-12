import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildExpirationDateFromDays,
  calculateSubscriptionDaysLeft,
} from './subscription';

const NOW = new Date(2026, 9, 12, 15, 30, 0); // 12/10/2026 15:30 local

describe('calculateSubscriptionDaysLeft', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve null sin fecha configurada o con fecha inválida', () => {
    expect(calculateSubscriptionDaysLeft(null)).toBeNull();
    expect(calculateSubscriptionDaysLeft(undefined)).toBeNull();
    expect(calculateSubscriptionDaysLeft('')).toBeNull();
    expect(calculateSubscriptionDaysLeft('   ')).toBeNull();
    expect(calculateSubscriptionDaysLeft('no-es-fecha')).toBeNull();
  });

  it('cuenta los días restantes redondeando hacia arriba', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // 30 días después de hoy (medianoche) → exactamente 30.
    expect(calculateSubscriptionDaysLeft('2026-11-11')).toBe(30);
    // Mañana → 1 día.
    expect(calculateSubscriptionDaysLeft('2026-10-13')).toBe(1);
  });

  it('devuelve 0 cuando la suscripción ya expiró', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(calculateSubscriptionDaysLeft('2026-10-11')).toBe(0);
    expect(calculateSubscriptionDaysLeft('2026-01-01')).toBe(0);
  });

  it('acepta fechas ISO completas además de YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // 2026-11-12T00:00:00Z → 30 días después del inicio del día local.
    expect(calculateSubscriptionDaysLeft('2026-11-12T00:00:00.000Z')).toBeGreaterThanOrEqual(29);
  });
});

describe('buildExpirationDateFromDays', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('suma los días indicados desde hoy en formato YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(buildExpirationDateFromDays(30)).toBe('2026-11-11');
    expect(buildExpirationDateFromDays(7)).toBe('2026-10-19');
  });

  it('devuelve null para plazos inválidos', () => {
    expect(buildExpirationDateFromDays(0)).toBeNull();
    expect(buildExpirationDateFromDays(-5)).toBeNull();
    expect(buildExpirationDateFromDays(2.5)).toBeNull();
    expect(buildExpirationDateFromDays(Number.NaN)).toBeNull();
  });
});
