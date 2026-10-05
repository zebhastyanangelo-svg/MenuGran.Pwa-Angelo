/**
 * Política de envío del comercio: si ofrece delivery, cuánto cobra y qué
 * monto se le suma al pedido.
 *
 * Todas las funciones son puras y tolerantes. El backend puede devolver
 * `null`, un string DECIMAL o un número fuera de rango, y el checkout debe
 * seguir calculando un total coherente en lugar de romperse.
 */

import type { OrderType } from '../types/database';

/** Cota inferior del costo de envío (0 = envío gratis). */
export const MIN_DELIVERY_FEE = 0;

/**
 * Cota superior del costo de envío en USD. Es una guarda contra un tecleo
 * accidental (un `500` en vez de un `5`) que inflaría el total del cliente.
 */
export const MAX_DELIVERY_FEE = 50;

/** Dois decimales, igual que `DECIMAL(10, 2)` en `merchants.delivery_fee`. */
const FEE_DECIMALS = 2;

/** Campos del comercio que intervienen en la política de envío. */
export interface MerchantDeliveryPolicy {
  /** `false` desactiva el delivery. `null`/ausente se trata como `true`. */
  offers_delivery?: boolean | null;
  /** Tarifa en USD. Puede venir como número o como string DECIMAL. */
  delivery_fee?: number | string | null;
}

/** `true` si el comercio tiene el delivery activo. */
export function isDeliveryAvailable(
  policy: MerchantDeliveryPolicy | null | undefined,
): boolean {
  return policy?.offers_delivery !== false;
}

/**
 * Normaliza la tarifa de envío escrita por el comercio. Devuelve `null` si el
 * valor está vacío, no es numérico o queda fuera del rango admitido.
 */
export function parseDeliveryFee(
  input: number | string | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;

  // `Number('')` es 0, así que un input solo con espacios se colaría como
  // "envío gratis". Se descarta antes de convertir para que un campo en blanco
  // signifique "no configurado" y no "gratis".
  const raw = typeof input === 'string' ? input.trim() : input;
  if (raw === '') return null;

  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < MIN_DELIVERY_FEE || numeric > MAX_DELIVERY_FEE) return null;

  return Number(numeric.toFixed(FEE_DECIMALS));
}

/**
 * `true` cuando el comercio escribió una tarifa pero el valor no es válido.
 * Permite avisar en el formulario en lugar de guardar 0 en silencio.
 */
export function isDeliveryFeeInputInvalid(
  input: number | string | null | undefined,
): boolean {
  if (input === null || input === undefined) return false;
  if (typeof input === 'string' && input.trim() === '') return false;
  return parseDeliveryFee(input) === null;
}

/**
 * Tarifa que se le suma a un pedido de tipo `orderType`.
 *
 * Devuelve `0` cuando el pedido es para retiro en local, cuando el comercio
 * no ofrece delivery o cuando la tarifa configurada es inválida: en los tres
 * casos el envío no se cobra. El redondeo a dos decimales mantiene el total
 * alineado con el DECIMAL de la base de datos.
 */
export function resolveDeliveryFee(
  policy: MerchantDeliveryPolicy | null | undefined,
  orderType: OrderType,
): number {
  if (orderType !== 'delivery') return 0;
  if (!isDeliveryAvailable(policy)) return 0;

  const fee = parseDeliveryFee(policy?.delivery_fee ?? null);
  return fee ?? 0;
}

/** `true` si el envío de este pedido se cobra (tarifa válida mayor que cero). */
export function isDeliveryFeeCharged(fee: number): boolean {
  return Number.isFinite(fee) && fee > 0;
}

/** Total del pedido en USD: subtotal + tarifa de envío, a dos decimales. */
export function calculateOrderTotal(
  subtotal: number | string,
  fee: number,
): number {
  const numericSubtotal =
    typeof subtotal === 'string' ? Number(subtotal) : subtotal;
  const safeSubtotal = Number.isFinite(numericSubtotal) ? numericSubtotal : 0;
  const safeFee = Number.isFinite(fee) ? fee : 0;
  return Number((safeSubtotal + safeFee).toFixed(FEE_DECIMALS));
}