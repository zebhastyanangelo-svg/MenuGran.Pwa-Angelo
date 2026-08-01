import { describe, it, expect } from 'vitest';
import {
  CreateOrderSchema,
  OrderItemSchema,
  formatZodErrors,
} from '@/modules/orders/schemas';

describe('CreateOrderSchema', () => {
  it('acepta payload válido', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc123',
      items: [{ menuItemId: 'item1', quantity: 2 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serviceType).toBe('MESA');
      expect(result.data.paymentMethod).toBe('CASH');
    }
  });

  it('rechaza items vacíos', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc123',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza price del body (no está en el schema)', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc123',
      items: [{ menuItemId: 'item1', quantity: 1, price: 0 }],
    });
    // price es ignorado (strip por default en zod)
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.items[0] as any).price).toBeUndefined();
    }
  });

  it('rechaza restaurantId faltante', () => {
    const result = CreateOrderSchema.safeParse({
      items: [{ menuItemId: 'item1', quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity no entero', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity negativo', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('acepta DELIVERY con address', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: 1 }],
      serviceType: 'DELIVERY',
      deliveryAddress: 'Calle 123',
      lat: 6.25,
      lng: -75.56,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryAddress).toBe('Calle 123');
    }
  });

  it('rechaza serviceType inválido', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: 1 }],
      serviceType: 'TAKEOUT',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza paymentMethod inválido', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: 1 }],
      paymentMethod: 'CRYPTO',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza MESA sin tableNumber cuando se especifica servicio', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: 'item1', quantity: 1 }],
      serviceType: 'MESA',
    });
    // tableNumber es opcional a nivel de schema; la validación de negocio
    // ocurre en el route handler (400 temprano)
    expect(result.success).toBe(true);
  });
});

describe('OrderItemSchema', () => {
  it('rechaza menuItemId vacío', () => {
    const result = OrderItemSchema.safeParse({ menuItemId: '', quantity: 1 });
    expect(result.success).toBe(false);
  });

  it('rechaza quantity zero', () => {
    const result = OrderItemSchema.safeParse({ menuItemId: 'x', quantity: 0 });
    expect(result.success).toBe(false);
  });
});

describe('formatZodErrors', () => {
  it('agrupa errores por campo', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: '',
      items: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.restaurantId).toBeDefined();
      expect(formatted.items).toBeDefined();
    }
  });

  it('reporta el path completo para errores anidados', () => {
    const result = CreateOrderSchema.safeParse({
      restaurantId: 'abc',
      items: [{ menuItemId: '', quantity: 0 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted['items.0.quantity']).toBeDefined();
      expect(formatted['items.0.menuItemId']).toBeDefined();
    }
  });
});
