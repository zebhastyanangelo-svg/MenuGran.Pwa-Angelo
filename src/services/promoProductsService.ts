/**
 * Vinculación de promociones con platos concretos del menú.
 *
 * El comercio tiene una promoción (etiqueta y/o descuento) y decide a qué
 * platos se le aplica, en lugar de que la promoción sea un chip global del
 * comercio. No hace falta una tabla puente: `products.badge_label` y
 * `products.discount_percentage` ya son el destino de la promoción y ya se
 * leen en la tarjeta del plato y en la ficha del local.
 */

import { supabase, TABLE_NAMES } from './supabase';

const PRODUCT_COLUMNS =
  'id, merchant_id, title, price, is_available, badge_label, discount_percentage';

/** Plato del menú tal y como lo necesita el selector de promociones. */
export interface PromoProduct {
  id: string;
  merchant_id: string;
  title: string;
  price: string;
  is_available: boolean;
  badge_label: string | null;
  discount_percentage: number | null;
}

/**
 * Lista los platos del comercio para el selector de promociones.
 *
 * Se filtra por `merchant_id` y se ordena por título: el select es de
 * navegación rápida y el comercio debe poder encontrar su plato por nombre.
 */
export async function fetchMerchantProducts(
  merchantId: string,
): Promise<PromoProduct[]> {
  if (!merchantId.trim()) return [];

  const { data, error } = await supabase
    .from(TABLE_NAMES.products)
    .select(PRODUCT_COLUMNS)
    .eq('merchant_id', merchantId)
    .order('title', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PromoProduct[];
}

/** Contenido de la promoción a aplicar a los platos seleccionados. */
export interface PromoAssignment {
  /** Etiqueta a escribir; `null` la deja sin etiqueta. */
  badgeLabel: string | null;
  /** Descuento 1-100; `null` lo deja sin descuento. */
  discountPercentage: number | null;
}

/** `true` cuando el producto ya tiene alguna señal de promoción activa. */
export function hasPromo(product: PromoProduct): boolean {
  return (
    product.badge_label !== null ||
    product.discount_percentage !== null
  );
}

/**
 * Aplica la promoción a los platos indicados y devuelve cuántos se
 * actualizaron.
 *
 * Actualiza solo `badge_label` y `discount_percentage`: el resto del plato
 * (precio, disponibilidad, imagen) no se toca, así que un error aquí no puede
 * alterar el menú. El `eq('merchant_id', …)` es una salvaguarda: aunque el
 * commerce manipulase los `id`, la RLS y este filtro impiden tocar platos de
 * otro comercio.
 *
 * Si la promoción no trae ni etiqueta ni descuento, ambos campos pasan a
 * `null`: es la desvinculación.
 */
export async function applyPromoToProducts(
  merchantId: string,
  productIds: readonly string[],
  promo: PromoAssignment,
): Promise<number> {
  const ids = productIds.filter((id) => id.trim().length > 0);
  if (ids.length === 0) return 0;

  const { data, error } = await supabase
    .from(TABLE_NAMES.products)
    .update({
      badge_label: promo.badgeLabel,
      discount_percentage: promo.discountPercentage,
    })
    .in('id', ids)
    .eq('merchant_id', merchantId)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

/** Quita la promoción de los platos indicados (etiqueta y descuento a null). */
export async function removePromoFromProducts(
  merchantId: string,
  productIds: readonly string[],
): Promise<number> {
  const ids = productIds.filter((id) => id.trim().length > 0);
  if (ids.length === 0) return 0;

  const { data, error } = await supabase
    .from(TABLE_NAMES.products)
    .update({ badge_label: null, discount_percentage: null })
    .in('id', ids)
    .eq('merchant_id', merchantId)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}