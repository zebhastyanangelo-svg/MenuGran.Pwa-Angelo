import { describe, expect, it } from 'vitest';
import {
  findTierForDistance,
  formatFeeTier,
  resolveDeliveryFeeByDistance,
  validateDeliveryFeeTiers,
} from './deliveryFeeTiers';
import type { DeliveryFeeTierRow } from '../types/database';

function makeTier(
  id: string,
  minKm: number,
  maxKm: number,
  fee: number,
): DeliveryFeeTierRow {
  return {
    id,
    merchant_id: 'merchant-1',
    min_km: minKm,
    max_km: maxKm,
    fee,
    created_at: '2026-00-01T00:00:00Z',
  };
}

describe('findTierForDistance', () => {
  const tiers = [
    makeTier('a', 0, 5, 2),
    makeTier('b', 5, 15, 4),
    makeTier('c', 15, 30, 6),
  ];

  it('encuentra el tramo para una distancia dentro del rango', () => {
    const tier = findTierForDistance(tiers, 3);
    expect(tier?.id).toBe('a');
  });

  it('encuentra el tramo en el límite superior exacto', () => {
    const tier = findTierForDistance(tiers, 15);
    expect(tier?.id).toBe('b');
  });

  it('devuelve null cuando la distancia supera todos los tramos', () => {
    expect(findTierForDistance(tiers, 50)).toBeNull();
  });

  it('devuelve null para distancias negativas', () => {
    expect(findTierForDistance(tiers, -1)).toBeNull();
  });

  it('funciona con tramos desordenados', () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(findTierForDistance(shuffled, 10)?.id).toBe('b');
  });
});

describe('resolveDeliveryFeeByDistance', () => {
  const tiers = [
    makeTier('a', 0, 5, 2),
    makeTier('b', 5, 15, 4),
  ];

  it('resuelve la tarifa del tramo correspondiente', () => {
    const result = resolveDeliveryFeeByDistance(tiers, 3);
    expect(result.fee).toBe(2);
    expect(result.tier?.id).toBe('a');
    expect(result.outOfRange).toBe(false);
  });

  it('marca outOfRange cuando la distancia excede el máximo', () => {
    const result = resolveDeliveryFeeByDistance(tiers, 20);
    expect(result.outOfRange).toBe(true);
    expect(result.fee).toBe(0);
    expect(result.tier).toBeNull();
  });

  it('outOfRange es true cuando no hay tramos y la distancia es positiva', () => {
    const result = resolveDeliveryFeeByDistance([], 10);
    expect(result.outOfRange).toBe(true);
  });

  it('outOfRange es false cuando no hay tramos y la distancia es 0', () => {
    const result = resolveDeliveryFeeByDistance([], 0);
    expect(result.outOfRange).toBe(false);
    expect(result.fee).toBe(0);
  });
});

describe('validateDeliveryFeeTiers', () => {
  it('tramos válidos pasan la validación', () => {
    const result = validateDeliveryFeeTiers([
      { minKm: 0, maxKm: 5, fee: 2 },
      { minKm: 5, maxKm: 15, fee: 4 },
    ]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('tramos que se solapan son inválidos', () => {
    const result = validateDeliveryFeeTiers([
      { minKm: 0, maxKm: 5, fee: 2 },
      { minKm: 4, maxKm: 10, fee: 3 },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('tarifa negativa es inválida', () => {
    const result = validateDeliveryFeeTiers([{ minKm: 0, maxKm: 5, fee: -1 }]);
    expect(result.isValid).toBe(false);
  });

  it('máximo menor o igual al mínimo es inválido', () => {
    const result = validateDeliveryFeeTiers([{ minKm: 5, maxKm: 5, fee: 2 }]);
    expect(result.isValid).toBe(false);
  });

  it('mínimo negativo es inválido', () => {
    const result = validateDeliveryFeeTiers([{ minKm: -1, maxKm: 5, fee: 2 }]);
    expect(result.isValid).toBe(false);
  });
});

describe('formatFeeTier', () => {
  it('formatea un tramo correctamente', () => {
    expect(formatFeeTier({ min_km: 0, max_km: 5, fee: 2 })).toBe('0.00 - 5.00 km → $2.00');
  });
});
