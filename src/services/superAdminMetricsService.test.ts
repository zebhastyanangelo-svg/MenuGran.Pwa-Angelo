import { describe, beforeEach, expect, it, vi } from 'vitest';
import {
  fetchSuperAdminMetrics,
  updateAuthPassword,
} from './superAdminMetricsService';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  updateUser: vi.fn(),
}));

const ratingSummaryMock = vi.hoisted(() => ({
  fetchPlatformRatingSummary: vi.fn(),
}));

vi.mock('./orderRatingService', () => ({
  fetchPlatformRatingSummary: ratingSummaryMock.fetchPlatformRatingSummary,
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { updateUser: supabaseMocks.updateUser },
    from: supabaseMocks.from,
  },
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    orders: 'orders',
  },
}));

function mockCount(count: number): {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  then: (resolve: (v: unknown) => unknown) => void;
} {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ count, error: null }),
  };
  return chain;
}

describe('fetchSuperAdminMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const counts: Record<string, number> = {
      merchants: 7,
      profiles: 42,
      orders: 120,
    };
    supabaseMocks.from.mockImplementation((table: string) =>
      mockCount(counts[table] ?? 0),
    );
    ratingSummaryMock.fetchPlatformRatingSummary.mockResolvedValue({
      average: 4.5,
      count: 12,
    });
  });

  it('devuelve los totales de comercios, clientes, pedidos y satisfacción', async () => {
    await expect(fetchSuperAdminMetrics()).resolves.toEqual({
      totalMerchants: 7,
      totalCustomers: 42,
      totalOrders: 120,
      platformSatisfaction: { average: 4.5, count: 12 },
    });
    expect(supabaseMocks.from).toHaveBeenCalledWith('merchants');
    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMocks.from).toHaveBeenCalledWith('orders');
  });

  it('degrade a "sin valoraciones" si la tabla de encuestas falla', async () => {
    ratingSummaryMock.fetchPlatformRatingSummary.mockRejectedValue(
      new Error('relation does not exist'),
    );

    await expect(fetchSuperAdminMetrics()).resolves.toMatchObject({
      totalOrders: 120,
      platformSatisfaction: { average: 0, count: 0 },
    });
  });

  it('filtra los perfiles por rol customer', async () => {
    const profilesChain = mockCount(42);
    let callIndex = 0;
    supabaseMocks.from.mockImplementation(() => {
      callIndex += 1;
      return callIndex === 2 ? profilesChain : mockCount(1);
    });

    await fetchSuperAdminMetrics();

    expect(profilesChain.eq).toHaveBeenCalledWith('role', 'customer');
  });
  it('propaga el error cuando alguna consulta falla', async () => {
    supabaseMocks.from.mockImplementation((table: string) =>
      table === 'orders'
        ? {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (v: unknown) => unknown) =>
              resolve({ count: null, error: { message: 'rls denied' } }),
          }
        : mockCount(1),
    );

    await expect(fetchSuperAdminMetrics()).rejects.toThrow(
      'Error al contar orders: rls denied',
    );
  });
});

describe('updateAuthPassword', () => {
  it('llama a supabase.auth.updateUser con la nueva contraseña', async () => {
    supabaseMocks.updateUser.mockResolvedValue({ error: null });

    await updateAuthPassword('NuevaClave123');

    expect(supabaseMocks.updateUser).toHaveBeenCalledWith({
      password: 'NuevaClave123',
    });
  });

  it('propaga el error cuando la actualización falla', async () => {
    supabaseMocks.updateUser.mockResolvedValue({
      error: { message: 'password too weak' },
    });

    await expect(updateAuthPassword('abc')).rejects.toThrow(
      'Error al actualizar la contraseña: password too weak',
    );
  });
});
