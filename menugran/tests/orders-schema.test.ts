import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schema de validación (copiado de orders/route.ts para testearlo aislado)
const OrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const CreateOrderSchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1, 'Al menos un item requerido'),
  serviceType: z.enum(['MESA', 'DELIVERY']).default('MESA'),
  tableNumber: z.number().int().positive().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  clientId: z.string().min(1).optional(),
});

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
