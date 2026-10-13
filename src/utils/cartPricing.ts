/**
 * Cálculo de precios con descuento para el carrito y el checkout.
 *
 * Prioridad de descuentos definida por el negocio:
 * 1. El descuento específico del plato (`products.discount_percentage`) gana
 *    siempre que esté configurado.
 * 2. Si el plato no tiene descuento propio, aplica el descuento porcentual
 *    general configurado por el comercio (`merchants.discount_percentage`).
 *
 * Los porcentajes nunca se acumulan: se elige uno y se aplica una sola vez.
 * Las funciones son puras y tolerantes a datos incompletos (carritos viejos
 * en localStorage, respuestas parciales del backend, valores fuera de rango).
 */

import { applyDiscount, parseDiscountPercentage } from './promos';
import type { CartItem } from '../types/cart';

/** Desglose de precios de una línea del carrito. */
export interface CartItemPricing {
  /** Precio de lista del plato, sin descuento. */
  originalUnitPrice: number;
  /** Precio unitario efectivo ya con el descuento aplicado. */
  unitPrice: number;
  /** Porcentaje aplicado; `null` cuando la línea no tiene descuento. */
  discountPercentage: number | null;
  /** `originalUnitPrice - unitPrice` de una sola unidad. */
  unitDiscountAmount: number;
  /** Total de la línea: `unitPrice * quantity`. */
  lineTotal: number;
}

/** Totales agregados de todo el carrito. */
export interface CartTotals {
  /** Suma de líneas a precio de lista, sin descuento. */
  originalTotal: number;
  /** Ahorro total del carrito en USD. */
  discountAmount: number;
  /** Etiqueta del porcentaje solo si todas las líneas comparten el mismo. */
  discountPercentage: number | null;
  /** Total a cobrar: suma de líneas con descuento. */
  total: number;
}

function toNumber(price: string | number | null | undefined): number {
  if (typeof price === 'number') {
    return Number.isFinite(price) ? price : 0;
  }
  if (typeof price !== 'string' || price.trim() === '') {
    return 0;
  }
  const parsed = parseFloat(price);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resuelve el precio unitario efectivo de un plato. El descuento del plato
 * tiene prioridad; si no existe, se aplica el descuento general del comercio.
 */
export function resolveUnitPrice(
  price: string | number | null | undefined,
  productDiscount: number | string | null | undefined,
  merchantDiscount: number | string | null | undefined,
): { unitPrice: number; discountPercentage: number | null } {
  const basePrice = toNumber(price);
  const discountPercentage =
    parseDiscountPercentage(productDiscount ?? null) ??
    parseDiscountPercentage(merchantDiscount ?? null);

  if (discountPercentage === null) {
    return { unitPrice: round2(basePrice), discountPercentage: null };
  }

  return {
    unitPrice: round2(applyDiscount(basePrice, discountPercentage)),
    discountPercentage,
  };
}

/**
 * Desglose de una línea del carrito. Los carritos persistidos antes de esta
 * funcionalidad no traen `unitPrice`, así que se recalcula con el descuento
 * del plato y el descuento del comercio guardado en la propia línea.
 */
export function resolveCartItemPricing(item: CartItem): CartItemPricing {
  const quantity = item.quantity > 0 ? item.quantity : 0;
  const originalUnitPrice = round2(toNumber(item.product.price));
  const storedUnitPrice =
    typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
      ? item.unitPrice
      : null;

  const { unitPrice, discountPercentage } =
    storedUnitPrice !== null
      ? {
          unitPrice: storedUnitPrice,
          discountPercentage:
            item.discountPercentage === null ||
            item.discountPercentage === undefined
              ? null
              : parseDiscountPercentage(item.discountPercentage),
        }
      : resolveUnitPrice(
          item.product.price,
          item.product.discount_percentage,
          item.merchantDiscountPercentage,
        );

  return {
    originalUnitPrice,
    unitPrice,
    discountPercentage,
    unitDiscountAmount: round2(originalUnitPrice - unitPrice),
    lineTotal: round2(unitPrice * quantity),
  };
}

/**
 * Totales del carrito: total original, ahorro por descuentos y total final
 * a cobrar. `discountPercentage` solo se llena cuando todas las líneas con
 * descuento comparten el mismo porcentaje (para poder mostrar "X% OFF").
 */
export function summarizeCartPricing(items: readonly CartItem[]): CartTotals {
  let originalTotal = 0;
  let discountAmount = 0;
  let total = 0;
  let sharedPercentage: number | null = null;
  let allSharePercentage = true;
  let hasAnyDiscount = false;

  for (const item of items) {
    const pricing = resolveCartItemPricing(item);
    originalTotal += pricing.originalUnitPrice * item.quantity;
    total += pricing.lineTotal;
    discountAmount += pricing.unitDiscountAmount * item.quantity;

    if (pricing.discountPercentage !== null) {
      hasAnyDiscount = true;
      if (sharedPercentage === null) {
        sharedPercentage = pricing.discountPercentage;
      } else if (sharedPercentage !== pricing.discountPercentage) {
        allSharePercentage = false;
      }
    }
  }

  return {
    originalTotal: round2(originalTotal),
    discountAmount: round2(discountAmount),
    discountPercentage:
      hasAnyDiscount && allSharePercentage ? sharedPercentage : null,
    total: round2(total),
  };
}
