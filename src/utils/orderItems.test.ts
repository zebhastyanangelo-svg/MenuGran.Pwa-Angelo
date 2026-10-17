import { describe, expect, it } from 'vitest';
import { buildOrderItems, itemsWithCustomizableIngredients } from './orderItems';
import type { CartItem } from '../types/cart';
import type { ProductRow } from '../types/database';

const BASE_PRODUCT: ProductRow = {
  id: 'p-1',
  merchant_id: 'm-1',
  category_id: 'cat-1',
  title: 'Pizza',
  description: null,
  price: '100.00',
  image_url: null,
  is_available: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

function buildCartItem(
  overrides: Partial<Omit<CartItem, 'product'>> & { product?: Partial<ProductRow> } = {},
): CartItem {
  const { product: productOverrides, ...rest } = overrides;
  return {
    product: { ...BASE_PRODUCT, ...productOverrides },
    quantity: 1,
    unitPrice: 100,
    discountPercentage: null,
    ...rest,
  };
}

describe('orderItems utilities', () => {
  describe('itemsWithCustomizableIngredients', () => {
    it('solo devuelve las líneas cuyo platillo tiene ingredientes', () => {
      const items = [
        buildCartItem({ product: { ingredients: ['Queso', 'Cebolla'] } }),
        buildCartItem({ product: { id: 'p-2', ingredients: [] } }),
        buildCartItem({ product: { id: 'p-3' } }),
      ];

      expect(itemsWithCustomizableIngredients(items).map((i) => i.product.id)).toEqual([
        'p-1',
      ]);
    });
  });

  describe('buildOrderItems', () => {
    it('congela el nombre del platillo y el precio unitario', () => {
      const items = buildOrderItems([
        buildCartItem({ product: { title: 'Pizza Pepperoni' } }),
      ]);

      expect(items).toEqual([
        {
          product_id: 'p-1',
          quantity: 1,
          unit_price: 100,
          title: 'Pizza Pepperoni',
        },
      ]);
    });

    it('incluye excluded_ingredients solo cuando el cliente tachó algo', () => {
      const [personalized] = buildOrderItems([
        buildCartItem({ excludedIngredients: ['  CEBOLLA ', 'Cebolla'] }),
      ]);
      const [plain] = buildOrderItems([buildCartItem({ excludedIngredients: [] })]);

      expect(personalized.excluded_ingredients).toEqual(['Cebolla']);
      expect(plain).not.toHaveProperty('excluded_ingredients');
    });

    it('incluye notes solo cuando la línea trae una nota con texto', () => {
      const [noted] = buildOrderItems([buildCartItem({ notes: '  Sin cebolla  ' })]);
      const [blank] = buildOrderItems([buildCartItem({ notes: '   ' })]);

      expect(noted.notes).toBe('Sin cebolla');
      expect(blank).not.toHaveProperty('notes');
    });

    it('recalcula el precio unitario con el descuento del platillo', () => {
      const [item] = buildOrderItems([
        buildCartItem({
          product: { price: '100.00', discount_percentage: 20 },
          unitPrice: NaN,
        }),
      ]);

      expect(item.unit_price).toBe(80);
    });
  });
});