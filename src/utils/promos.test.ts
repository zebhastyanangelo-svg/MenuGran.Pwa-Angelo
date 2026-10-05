import { describe, expect, it } from 'vitest';
import {
  BADGE_LABEL_SUGGESTIONS,
  ESTIMATED_RANGE_BUFFER_MINUTES,
  MAX_BADGE_LABEL_LENGTH,
  MAX_DISCOUNT_PERCENTAGE,
  MAX_ESTIMATED_MINUTES,
  MIN_DISCOUNT_PERCENTAGE,
  PROMO_LABEL_SUGGESTIONS,
  applyDiscount,
  formatDiscountBadge,
  formatEstimatedDeliveryRange,
  parseBadgeLabel,
  parseDiscountPercentage,
  parseEstimatedMinutes,
  resolveMerchantPromoChips,
  resolveProductBadges,
} from './promos';

describe('parseDiscountPercentage', () => {
  it('normaliza textos y números dentro de rango', () => {
    expect(parseDiscountPercentage('20')).toBe(20);
    expect(parseDiscountPercentage(' 15 ')).toBe(15);
    expect(parseDiscountPercentage(50)).toBe(50);
    expect(parseDiscountPercentage('33.6')).toBe(34);
  });

  it('devuelve null para valores vacíos o fuera de rango', () => {
    expect(parseDiscountPercentage(null)).toBeNull();
    expect(parseDiscountPercentage(undefined)).toBeNull();
    expect(parseDiscountPercentage('')).toBeNull();
    expect(parseDiscountPercentage('   ')).toBeNull();
    expect(parseDiscountPercentage('0')).toBeNull();
    expect(parseDiscountPercentage('-10')).toBeNull();
    expect(parseDiscountPercentage(String(MAX_DISCOUNT_PERCENTAGE + 1))).toBeNull();
    expect(parseDiscountPercentage('abc')).toBeNull();
    expect(parseDiscountPercentage(Number.NaN)).toBeNull();
    expect(parseDiscountPercentage(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('acepta los extremos del rango permitido', () => {
    expect(parseDiscountPercentage(MIN_DISCOUNT_PERCENTAGE)).toBe(1);
    expect(parseDiscountPercentage(MAX_DISCOUNT_PERCENTAGE)).toBe(100);
  });
});

describe('parseBadgeLabel', () => {
  it('recorta espacios y rechaza etiquetas vacías', () => {
    expect(parseBadgeLabel('  Más vendido ')).toBe('Más vendido');
    expect(parseBadgeLabel('')).toBeNull();
    expect(parseBadgeLabel('   ')).toBeNull();
    expect(parseBadgeLabel(null)).toBeNull();
    expect(parseBadgeLabel(undefined)).toBeNull();
  });

  it('rechaza etiquetas más largas que el máximo admitido', () => {
    const tooLong = 'a'.repeat(MAX_BADGE_LABEL_LENGTH + 1);
    expect(parseBadgeLabel(tooLong)).toBeNull();
    expect(parseBadgeLabel('a'.repeat(MAX_BADGE_LABEL_LENGTH))).toHaveLength(
      MAX_BADGE_LABEL_LENGTH,
    );
  });
});

describe('parseEstimatedMinutes', () => {
  it('normaliza el tiempo dentro de rango', () => {
    expect(parseEstimatedMinutes('25')).toBe(25);
    expect(parseEstimatedMinutes(30)).toBe(30);
    expect(parseEstimatedMinutes(' 40.4 ')).toBe(40);
  });

  it('devuelve null para valores ausentes o fuera de rango', () => {
    expect(parseEstimatedMinutes(null)).toBeNull();
    expect(parseEstimatedMinutes(undefined)).toBeNull();
    expect(parseEstimatedMinutes('')).toBeNull();
    expect(parseEstimatedMinutes('0')).toBeNull();
    expect(parseEstimatedMinutes(String(MAX_ESTIMATED_MINUTES + 1))).toBeNull();
    expect(parseEstimatedMinutes('no-es-un-numero')).toBeNull();
  });
});

describe('formatDiscountBadge', () => {
  it('formatea el descuento como chip', () => {
    expect(formatDiscountBadge(20)).toBe('20% OFF');
    expect(formatDiscountBadge('35')).toBe('35% OFF');
  });

  it('devuelve null cuando no hay descuento válido', () => {
    expect(formatDiscountBadge(null)).toBeNull();
    expect(formatDiscountBadge(undefined)).toBeNull();
    expect(formatDiscountBadge(0)).toBeNull();
    expect(formatDiscountBadge(150)).toBeNull();
  });
});

describe('formatEstimatedDeliveryRange', () => {
  it('muestra el rango base..base+buffer', () => {
    expect(formatEstimatedDeliveryRange(25)).toBe('25-35 min');
    expect(formatEstimatedDeliveryRange('30')).toBe('30-40 min');
  });

  it('usa el margen configurado para el extremo superior', () => {
    expect(formatEstimatedDeliveryRange(10)).toBe(
      `10-${10 + ESTIMATED_RANGE_BUFFER_MINUTES} min`,
    );
  });

  it('devuelve null cuando el comercio no configuró el tiempo', () => {
    expect(formatEstimatedDeliveryRange(null)).toBeNull();
    expect(formatEstimatedDeliveryRange(undefined)).toBeNull();
    expect(formatEstimatedDeliveryRange('x')).toBeNull();
  });
});

describe('resolveMerchantPromoChips', () => {
  it('devuelve descuento y etiqueta en ese orden', () => {
    const chips = resolveMerchantPromoChips({
      discount_percentage: 20,
      promo_label: '2x1',
    });

    expect(chips).toEqual([
      { key: 'merchant-discount', kind: 'discount', label: '20% OFF' },
      { key: 'merchant-promo', kind: 'promo', label: '2x1' },
    ]);
  });

  it('devuelve solo lo que el comercio configuró', () => {
    expect(resolveMerchantPromoChips({ promo_label: 'Envío gratis' })).toEqual([
      { key: 'merchant-promo', kind: 'promo', label: 'Envío gratis' },
    ]);
    expect(resolveMerchantPromoChips({ discount_percentage: 10 })).toHaveLength(1);
  });

  it('devuelve lista vacía sin promociones', () => {
    expect(resolveMerchantPromoChips({})).toEqual([]);
    expect(
      resolveMerchantPromoChips({ discount_percentage: null, promo_label: '  ' }),
    ).toEqual([]);
  });
});

describe('resolveProductBadges', () => {
  it('devuelve descuento y distintivo del plato', () => {
    const badges = resolveProductBadges({
      discount_percentage: 20,
      badge_label: 'Más vendido',
    });

    expect(badges).toEqual([
      { key: 'product-discount', kind: 'discount', label: '20% OFF' },
      { key: 'product-badge', kind: 'badge', label: 'Más vendido' },
    ]);
  });

  it('devuelve lista vacía cuando el plato no tiene etiquetas', () => {
    expect(resolveProductBadges({})).toEqual([]);
    expect(resolveProductBadges({ badge_label: null, discount_percentage: 0 })).toEqual([]);
  });
});

describe('applyDiscount', () => {
  it('aplica el porcentaje sobre el precio', () => {
    expect(applyDiscount(100, 20)).toBeCloseTo(80);
    expect(applyDiscount(9.99, 50)).toBeCloseTo(4.995);
  });

  it('devuelve el precio intacto sin descuento válido', () => {
    expect(applyDiscount(100, null)).toBe(100);
    expect(applyDiscount(100, 0)).toBe(100);
    expect(applyDiscount(100, 101)).toBe(100);
  });
});

describe('sugerencias de etiquetas', () => {
  it('expone sugerencias utilizables por los formularios', () => {
    expect(BADGE_LABEL_SUGGESTIONS).toContain('Más vendido');
    expect(PROMO_LABEL_SUGGESTIONS).toContain('2x1');
    BADGE_LABEL_SUGGESTIONS.forEach((label) => {
      expect(parseBadgeLabel(label)).not.toBeNull();
    });
    PROMO_LABEL_SUGGESTIONS.forEach((label) => {
      expect(parseBadgeLabel(label)).not.toBeNull();
    });
  });
});