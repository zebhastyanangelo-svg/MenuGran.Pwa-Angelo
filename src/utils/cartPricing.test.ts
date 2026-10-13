import { describe, expect, it } from 'vitest';
import {
  resolveUnitPrice,
  resolveCartItemPricing,
  summarizeCartPricing,
} from './cartPricing';
import type { CartItem } from '../types/cart';
import type { ProductRow } from '../types/database';

function buildProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'p-1',
    merchant_id: 'm-1',
    category_id: 'cat-1',
    title: 'Arepa',
    description: null,
    price: '5.00',
    image_url: null,
    is_available: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = overrides.product ?? buildProduct();
  return {
    product,
    quantity: 1,
    merchantDiscountPercentage: null,
    unitPrice: parseFloat(product.price),
    discountPercentage: null,
    ...overrides,
  };
}

describe('resolveUnitPrice', () => {
  it('devuelve el precio intacto sin ningún descuento', () => {
    const result = resolveUnitPrice('5.00', null, null);
    expect(result).toEqual({ unitPrice: 5, discountPercentage: null });
  });

  it('aplica el descuento del plato cuando lo tiene', () => {
    const result = resolveUnitPrice('5.00', 20, null);
    expect(result).toEqual({ unitPrice: 4, discountPercentage: 20 });
  });

  it('aplica el descuento general del comercio si el plato no tiene', () => {
    const result = resolveUnitPrice('5.00', null, 10);
    expect(result).toEqual({ unitPrice: 4.5, discountPercentage: 10 });
  });

  it('el descuento del plato gana sobre el del comercio (no se acumulan)', () => {
    const result = resolveUnitPrice('5.00', 4, 3);
    expect(result).toEqual({ unitPrice: 4.8, discountPercentage: 4 });
  });

  it('redondea a 2 decimales', () => {
    const result = resolveUnitPrice('9.99', 33, null);
    expect(result.unitPrice).toBe(6.69);
  });

  it('ignora descuentos inválidos (0, fuera de rango o no numéricos)', () => {
    expect(resolveUnitPrice('5.00', 0, 0)).toEqual({
      unitPrice: 5,
      discountPercentage: null,
    });
    expect(resolveUnitPrice('5.00', 150, -5)).toEqual({
      unitPrice: 5,
      discountPercentage: null,
    });
    expect(resolveUnitPrice('5.00', 'abc', null).unitPrice).toBe(5);
  });

  it('tolera precios inválidos devolviendo 0', () => {
    expect(resolveUnitPrice('', null, null).unitPrice).toBe(0);
    expect(resolveUnitPrice('no-number', null, null).unitPrice).toBe(0);
    expect(resolveUnitPrice(null, null, 10).unitPrice).toBe(0);
  });
});

describe('resolveCartItemPricing', () => {
  it('usa el unitPrice almacenado cuando existe', () => {
    const item = buildCartItem({ unitPrice: 4, discountPercentage: 20 });
    const pricing = resolveCartItemPricing(item);
    expect(pricing.unitPrice).toBe(4);
    expect(pricing.discountPercentage).toBe(20);
    expect(pricing.lineTotal).toBe(4);
  });

  it('recalcula para carritos persistidos sin unitPrice', () => {
    const item = {
      product: buildProduct({ price: '5.00', discount_percentage: 20 }),
      quantity: 2,
    } as CartItem;
    const pricing = resolveCartItemPricing(item);
    expect(pricing.unitPrice).toBe(4);
    expect(pricing.lineTotal).toBe(8);
    expect(pricing.unitDiscountAmount).toBe(1);
  });

  it('recalcula con el descuento del comercio guardado en la línea', () => {
    const item = {
      product: buildProduct({ price: '5.00' }),
      quantity: 1,
      merchantDiscountPercentage: 10,
    } as CartItem;
    const pricing = resolveCartItemPricing(item);
    expect(pricing.unitPrice).toBe(4.5);
    expect(pricing.discountPercentage).toBe(10);
  });

  it('maneja cantidad 0 o negativa sin lineTotal', () => {
    const item = buildCartItem({ quantity: -3 });
    expect(resolveCartItemPricing(item).lineTotal).toBe(0);
  });
});

describe('summarizeCartPricing', () => {
  it('sumiza un carrito sin descuentos', () => {
    const totals = summarizeCartPricing([
      buildCartItem(),
      buildCartItem({
        product: buildProduct({ id: 'p-2', price: '3.00' }),
        unitPrice: 3,
        discountPercentage: null,
        quantity: 2,
      }),
    ]);
    expect(totals).toEqual({
      originalTotal: 11,
      discountAmount: 0,
      discountPercentage: null,
      total: 11,
    });
  });

  it('suma el ahorro cuando el descuento viene del plato', () => {
    const totals = summarizeCartPricing([
      buildCartItem({ unitPrice: 4, discountPercentage: 20, quantity: 3 }),
    ]);
    expect(totals).toEqual({
      originalTotal: 15,
      discountAmount: 3,
      discountPercentage: 20,
      total: 12,
    });
  });

  it('no comparte porcentaje si las líneas tienen descuentos distintos', () => {
    const totals = summarizeCartPricing([
      buildCartItem({ unitPrice: 4, discountPercentage: 20 }),
      buildCartItem({
        product: buildProduct({ id: 'p-2', price: '10.00' }),
        unitPrice: 9,
        discountPercentage: 10,
      }),
    ]);
    expect(totals.discountAmount).toBe(2);
    expect(totals.discountPercentage).toBeNull();
    expect(totals.total).toBe(13);
  });

  it('devuelve total 0 para carrito vacío', () => {
    expect(summarizeCartPricing([])).toEqual({
      originalTotal: 0,
      discountAmount: 0,
      discountPercentage: null,
      total: 0,
    });
  });
});
