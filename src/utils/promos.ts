/**
 * Utilidades de promociones y señales visuales (badges, descuentos y tiempo
 * estimado) que el comercio configura desde su panel y que el marketplace
 * renderiza de forma dinámica.
 *
 * Todas las funciones son puras y tolerantes: el backend puede devolver
 * `null`, valores fuera de rango o tipos inesperados, y la interfaz debe
 * seguir funcionando mostrando simplemente la etiqueta que sea válida.
 */

/** Rango permitido para descuentos en porcentaje (coincide con el CHECK SQL). */
export const MIN_DISCOUNT_PERCENTAGE = 1;
export const MAX_DISCOUNT_PERCENTAGE = 100;

/** Rango permitido para el tiempo estimado de preparación (minutos). */
export const MIN_ESTIMATED_MINUTES = 1;
export const MAX_ESTIMATED_MINUTES = 240;

/** Margen que se suma al tiempo base para construir el rango mostrado. */
export const ESTIMATED_RANGE_BUFFER_MINUTES = 10;

/** Longitud máxima de una etiqueta escrita por el comercio. */
export const MAX_BADGE_LABEL_LENGTH = 24;

/** Sugerencias ofrecidas en los formularios del panel. */
export const BADGE_LABEL_SUGGESTIONS: readonly string[] = [
  'Más vendido',
  'Nuevo',
  '2x1',
  'Oferta',
  'Recomendado',
  'Del día',
];

export const PROMO_LABEL_SUGGESTIONS: readonly string[] = [
  '2x1',
  'Envío gratis',
  'Oferta del día',
  'Combo familiar',
  'Menú ejecutivo',
];

export type PromoChipKind = 'discount' | 'promo';
export type ProductBadgeKind = 'discount' | 'badge';

export interface PromoChip {
  key: string;
  kind: PromoChipKind;
  label: string;
}

export interface ProductBadge {
  key: string;
  kind: ProductBadgeKind;
  label: string;
}

function clampPercentage(value: number): number {
  return Math.min(MAX_DISCOUNT_PERCENTAGE, Math.max(MIN_DISCOUNT_PERCENTAGE, value));
}

/**
 * Normaliza un porcentaje de descuento proveniente de un input de texto o de
 * la base de datos. Devuelve `null` cuando no hay descuento que mostrar.
 */
export function parseDiscountPercentage(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined || input === '') return null;

  const numeric = typeof input === 'number' ? input : Number(input.trim());
  if (!Number.isFinite(numeric)) return null;

  const rounded = Math.round(numeric);
  if (rounded < MIN_DISCOUNT_PERCENTAGE || rounded > MAX_DISCOUNT_PERCENTAGE) {
    return null;
  }
  return rounded;
}

/**
 * `true` cuando el comercio escribió un descuento pero el valor no es válido
 * (fuera de rango o no numérico). Permite avisar en el formulario en lugar de
 * ignorar el valor en silencio.
 */
export function isDiscountPercentageInputInvalid(
  input: string | number | null | undefined,
): boolean {
  if (input === null || input === undefined) return false;
  if (typeof input === 'string' && input.trim() === '') return false;
  return parseDiscountPercentage(input) === null;
}

/** `true` cuando el comercio escribió minutos pero el valor no es válido. */
export function isEstimatedMinutesInputInvalid(
  input: string | number | null | undefined,
): boolean {
  if (input === null || input === undefined) return false;
  if (typeof input === 'string' && input.trim() === '') return false;
  return parseEstimatedMinutes(input) === null;
}

/**
 * Normaliza una etiqueta escrita por el comercio. Devuelve `null` si queda
 * vacía o si excede la longitud máxima admitida por la interfaz.
 */
export function parseBadgeLabel(
  input: string | null | undefined,
): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_BADGE_LABEL_LENGTH) return null;
  return trimmed;
}

/**
 * Normaliza el tiempo estimado de preparación en minutos. Devuelve `null` si
 * el comercio no lo configuró o si el valor está fuera del rango admitido.
 */
export function parseEstimatedMinutes(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined || input === '') return null;

  const numeric = typeof input === 'number' ? input : Number(input.trim());
  if (!Number.isFinite(numeric)) return null;

  const rounded = Math.round(numeric);
  if (rounded < MIN_ESTIMATED_MINUTES || rounded > MAX_ESTIMATED_MINUTES) {
    return null;
  }
  return rounded;
}

/** Formatea el descuento como chip, por ejemplo "20% OFF". */
export function formatDiscountBadge(
  percentage: string | number | null | undefined,
): string | null {
  const parsed = parseDiscountPercentage(percentage);
  if (parsed === null) return null;
  return `${clampPercentage(parsed)}% OFF`;
}

/**
 * Construye el rango de tiempo estimado que se muestra con el icono de reloj,
 * por ejemplo "25-35 min" a partir de un tiempo base de 25 minutos.
 */
export function formatEstimatedDeliveryRange(
  minutes: string | number | null | undefined,
): string | null {
  const parsed = parseEstimatedMinutes(minutes);
  if (parsed === null) return null;
  return `${parsed}-${parsed + ESTIMATED_RANGE_BUFFER_MINUTES} min`;
}

/**
 * Chips flotantes de un comercio: primero el descuento y después la etiqueta
 * libre. Devuelve `[]` cuando el comercio no configuró ninguna promoción.
 */
export function resolveMerchantPromoChips(merchant: {
  discount_percentage?: number | null;
  promo_label?: string | null;
}): PromoChip[] {
  const chips: PromoChip[] = [];

  const discount = formatDiscountBadge(merchant.discount_percentage);
  if (discount !== null) {
    chips.push({ key: 'merchant-discount', kind: 'discount', label: discount });
  }

  const label = parseBadgeLabel(merchant.promo_label);
  if (label !== null) {
    chips.push({ key: 'merchant-promo', kind: 'promo', label });
  }

  return chips;
}

/**
 * Etiquetas de un plato: descuento y distintivo. Devuelve `[]` cuando el
 * plato no tiene ninguna etiqueta activa.
 */
export function resolveProductBadges(product: {
  badge_label?: string | null;
  discount_percentage?: number | null;
}): ProductBadge[] {
  const badges: ProductBadge[] = [];

  const discount = formatDiscountBadge(product.discount_percentage);
  if (discount !== null) {
    badges.push({ key: 'product-discount', kind: 'discount', label: discount });
  }

  const label = parseBadgeLabel(product.badge_label);
  if (label !== null) {
    badges.push({ key: 'product-badge', kind: 'badge', label });
  }

  return badges;
}

/** Precio final tras aplicar el descuento configurado (0 si no hay). */
export function applyDiscount(price: number, percentage: number | null): number {
  const parsed = parseDiscountPercentage(percentage);
  if (parsed === null || !Number.isFinite(price) || price <= 0) return price;
  return price * (1 - parsed / 100);
}