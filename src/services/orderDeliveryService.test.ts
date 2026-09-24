import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmOrderDelivery } from './orderDeliveryService';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: supabaseMocks.from },
  TABLE_NAMES: { orders: 'orders' },
}));

function buildUpdateChain(result: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn().mockResolvedValue(result),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

describe('confirmOrderDelivery', () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
  });

  it('lanza error si no se proporciona id de orden', async () => {
    await expect(confirmOrderDelivery('')).rejects.toThrow(
      'ID de orden no proporcionado',
    );
  });

  it('ejecuta UPDATE status=delivered y devuelve la fila actualizada', async () => {
    const updatedRow = { id: 'order-1', status: 'delivered' };
    const chain = buildUpdateChain({ data: [updatedRow], error: null });
    supabaseMocks.from.mockReturnValue(chain);

    const result = await confirmOrderDelivery('order-1');

    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
    expect(chain.update).toHaveBeenCalledWith({ status: 'delivered' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'order-1');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(result).toEqual(updatedRow);
  });

  it('lanza error cuando supabase devuelve error', async () => {
    supabaseMocks.from.mockReturnValue(
      buildUpdateChain({ data: null, error: new Error('db down') }),
    );

    await expect(confirmOrderDelivery('order-1')).rejects.toThrow('db down');
  });

  it('lanza error cuando RLS bloquea el UPDATE (0 filas sin error)', async () => {
    supabaseMocks.from.mockReturnValue(
      buildUpdateChain({ data: [], error: null }),
    );

    await expect(confirmOrderDelivery('order-1')).rejects.toThrow(
      'No se pudo confirmar la entrega',
    );
  });

  it('lanza error si la fila devuelta no quedó en delivered', async () => {
    supabaseMocks.from.mockReturnValue(
      buildUpdateChain({
        data: [{ id: 'order-1', status: 'on_the_way' }],
        error: null,
      }),
    );

    await expect(confirmOrderDelivery('order-1')).rejects.toThrow(
      'No se pudo confirmar la entrega',
    );
  });
});
