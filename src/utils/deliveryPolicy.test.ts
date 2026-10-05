import { describe, expect, it } from 'vitest';
import {
  MAX_DELIVERY_FEE,
  calculateOrderTotal,
  isDeliveryAvailable,
  isDeliveryFeeCharged,
  isDeliveryFeeInputInvalid,
  parseDeliveryFee,
  resolveDeliveryFee,
} from './deliveryPolicy';

describe('isDeliveryAvailable', () => {
  it('trata un valor ausente como delivery habilitado', () => {
    expect(isDeliveryAvailable(null)).toBe(true);
    expect(isDeliveryAvailable(undefined)).toBe(true);
    expect(isDeliveryAvailable({})).toBe(true);
    expect(isDeliveryAvailable({ offers_delivery: null })).toBe(true);
  });

  it('solo deshabilita cuando el comercio lo marcó explícitamente', () => {
    expect(isDeliveryAvailable({ offers_delivery: false })).toBe(false);
    expect(isDeliveryAvailable({ offers_delivery: true })).toBe(true);
  });
});

describe('parseDeliveryFee', () => {
  it('normaliza strings DECIMAL y números a dos decimales', () => {
    expect(parseDeliveryFee('2.5')).toBe(2.5);
    expect(parseDeliveryFee(' 3 ')).toBe(3);
    expect(parseDeliveryFee('1.239')).toBe(1.24);
  });

  it('devuelve null para vacío, no numérico o fuera de rango', () => {
    expect(parseDeliveryFee(null)).toBeNull();
    expect(parseDeliveryFee(undefined)).toBeNull();
    expect(parseDeliveryFee('')).toBeNull();
    expect(parseDeliveryFee('   ')).toBeNull();
    expect(parseDeliveryFee('gratis')).toBeNull();
    expect(parseDeliveryFee(-1)).toBeNull();
    expect(parseDeliveryFee(MAX_DELIVERY_FEE + 1)).toBeNull();
  });
});

describe('isDeliveryFeeInputInvalid', () => {
  it('no marca vacío ni ausente como inválido', () => {
    expect(isDeliveryFeeInputInvalid(null)).toBe(false);
    expect(isDeliveryFeeInputInvalid('')).toBe(false);
    expect(isDeliveryFeeInputInvalid('  ')).toBe(false);
  });

  it('marca valores escritos pero inválidos', () => {
    expect(isDeliveryFeeInputInvalid('mucho')).toBe(true);
    expect(isDeliveryFeeInputInvalid('-3')).toBe(true);
    expect(isDeliveryFeeInputInvalid(999)).toBe(true);
  });
});

describe('resolveDeliveryFee', () => {
  it('cobra la tarifa configurada en un pedido a domicilio', () => {
    expect(
      resolveDeliveryFee({ offers_delivery: true, delivery_fee: '2.50' }, 'delivery'),
    ).toBe(2.5);
  });

  it('no cobra nada en un pedido para retiro en local', () => {
    expect(
      resolveDeliveryFee({ offers_delivery: true, delivery_fee: '2.50' }, 'pickup'),
    ).toBe(0);
    expect(
      resolveDeliveryFee({ offers_delivery: true, delivery_fee: '2.50' }, 'in_store'),
    ).toBe(0);
  });

  it('no cobra nada si el comercio no ofrece delivery', () => {
    expect(
      resolveDeliveryFee({ offers_delivery: false, delivery_fee: '9.99' }, 'delivery'),
    ).toBe(0);
  });

  it('degrada a envío gratis cuando la tarifa es inválida', () => {
    expect(resolveDeliveryFee({ delivery_fee: 'mucho' }, 'delivery')).toBe(0);
    expect(resolveDeliveryFee({ delivery_fee: null }, 'delivery')).toBe(0);
  });
});

describe('isDeliveryFeeCharged', () => {
  it('distingue envío gratis de envío cobrado', () => {
    expect(isDeliveryFeeCharged(0)).toBe(false);
    expect(isDeliveryFeeCharged(0.01)).toBe(true);
    expect(isDeliveryFeeCharged(Number.NaN)).toBe(false);
  });
});

describe('calculateOrderTotal', () => {
  it('suma subtotal y tarifa', () => {
    expect(calculateOrderTotal('10.00', 2.5)).toBe(12.5);
  });

  it('acepta el subtotal como número y redondea a dos decimales', () => {
    expect(calculateOrderTotal(10, 0.005)).toBe(10.01);
  });

  it('degrada a cero cuando los valores no son numéricos', () => {
    expect(calculateOrderTotal('no-es-un-numero', 3)).toBe(3);
    expect(calculateOrderTotal('no-es-un-numero', Number.NaN)).toBe(0);
  });
});