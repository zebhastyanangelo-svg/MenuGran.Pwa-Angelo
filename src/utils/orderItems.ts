/**
 * Traducción de las líneas del carrito al payload que se guarda en
 * `orders.items` (JSONB).
 *
 * Se congela aquí el nombre del platillo y los ingredientes que el cliente
 * tachó, para que la comanda de cocina no dependa de cómo esté el catálogo en
 * el momento de imprimir.
 */

import type { CartItem } from '../types/cart';
import type { OrderItem } from '../types/database';
import { resolveCartItemPricing } from './cartPricing';
import { sanitizeIngredientList } from './ingredients';

/**
 * Líneas cuyo platillo tiene ingredientes configurados, es decir, las únicas
 * que ofrecen la personalización con tachado en el checkout.
 */
export function itemsWithCustomizableIngredients(
  items: readonly CartItem[],
): CartItem[] {
  return items.filter((item) => sanitizeIngredientList(item.product.ingredients).length > 0);
}

/**
 * Convierte el carrito en los ítems de la orden. `excluded_ingredients` solo se
 * incluye cuando el cliente tachó algo: los pedidos sin personalización no
 * necesitan arrastrar una lista vacía.
 */
export function buildOrderItems(items: readonly CartItem[]): OrderItem[] {
  return items.map((item) => {
    const excludedIngredients = sanitizeIngredientList(item.excludedIngredients);
    return {
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: resolveCartItemPricing(item).unitPrice,
      title: item.product.title,
      ...(excludedIngredients.length > 0
        ? { excluded_ingredients: excludedIngredients }
        : {}),
    };
  });
}