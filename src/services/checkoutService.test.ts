import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createOrder } from './checkoutService';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
      })),
    },
  },
  TABLE_NAMES: {
    orders: 'orders',
  },
}));

describe('checkoutService', () => {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn(),
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);
  });

  it('inserta orden con deliveryLocation y devuelve id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'order-123' }, error: null });
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    const orderId = await createOrder({
      merchantId: 'm-1',
      customerId: 'c-1',
      orderType: 'delivery',
      paymentMethod: 'pago_movil',
      paymentReference: 'REF123',
      totalAmount: 50,
      items: [{ product_id: 'p-1', quantity: 2, unit_price: 25 }],
      deliveryLocation: { x: -66.9036, y: 10.4806 },
      deliveryAddress: 'Calle Falsa 123',
      paymentProofUrl: 'proof.jpg',
    });

    expect(orderId).toBe('order-123');
    expect(supabase.from).toHaveBeenCalledWith('orders');
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });

  it('lanza error si supabase devuelve error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    await expect(
      createOrder({
        merchantId: 'm-1',
        customerId: 'c-1',
        orderType: 'pickup',
        paymentMethod: 'cash',
        paymentReference: '',
        totalAmount: 10,
        items: [{ product_id: 'p-1', quantity: 1, unit_price: 10 }],
      })
    ).rejects.toThrow('db error');
  });
});