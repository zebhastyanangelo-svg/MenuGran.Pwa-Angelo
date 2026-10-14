import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../test/test-query-client';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: supabaseMock,
  TABLE_NAMES: { orderRatings: 'order_ratings' },
}));

import { useSuperAdminRatings } from './useSuperAdminRatings';

function mockQueryResult(result: { data: unknown; error: { message: string } | null }): void {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };
  supabaseMock.from.mockReturnValue(builder);
}

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    order_id: 'o-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    merchant_stars: 5,
    driver_stars: null,
    platform_stars: 5,
    platform_comment: null,
    created_at: '2026-10-01T10:00:00Z',
    merchants: [{ name: 'La Pizza' }],
    profiles: { full_name: 'María', email: 'maria@example.com' },
    ...overrides,
  };
}

function renderRatingsHook() {
  const client = createTestQueryClient();
  const renderResult = renderHook(() => useSuperAdminRatings(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...renderResult, client };
}

describe('useSuperAdminRatings', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
  });

  it('carga el reporte con categorías, comercios e interacciones', async () => {
    mockQueryResult({
      data: [
        buildRow(),
        buildRow({
          id: 'r-2',
          order_id: 'o-2',
          merchant_id: 'm-malo',
          merchant_stars: 1,
          platform_stars: 2,
          platform_comment: 'Tardó mucho',
        }),
      ],
      error: null,
    });

    const { result } = renderRatingsHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual({ total: 2, good: 1, normal: 0, bad: 1 });
    expect(result.current.merchants[0].merchantId).toBe('m-malo');
    expect(result.current.interactions).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('filtra las interacciones por categoría', async () => {
    mockQueryResult({
      data: [
        buildRow(),
        buildRow({ id: 'r-2', order_id: 'o-2', merchant_stars: 2, platform_stars: 2 }),
      ],
      error: null,
    });

    const { result } = renderRatingsHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setCategoryFilter('bad');
    });

    expect(result.current.interactions).toHaveLength(1);
    expect(result.current.interactions[0].id).toBe('r-2');
  });

  it('filtra por comercio y por búsqueda de texto', async () => {
    mockQueryResult({
      data: [
        buildRow(),
        buildRow({
          id: 'r-2',
          order_id: 'o-2',
          merchant_id: 'm-2',
          merchants: [{ name: 'El Arepazo' }],
          customer_id: 'c-2',
          profiles: { full_name: 'Carlos', email: 'carlos@example.com' },
          merchant_stars: 3,
          platform_stars: 3,
        }),
      ],
      error: null,
    });

    const { result } = renderRatingsHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setMerchantFilter('m-2');
    });
    expect(result.current.interactions).toHaveLength(1);
    expect(result.current.interactions[0].merchantName).toBe('El Arepazo');

    act(() => {
      result.current.setMerchantFilter('all');
      result.current.setSearchQuery('carlos');
    });
    expect(result.current.interactions).toHaveLength(1);
    expect(result.current.interactions[0].customerName).toBe('Carlos');

    act(() => {
      result.current.setSearchQuery('inexistente');
    });
    expect(result.current.interactions).toHaveLength(0);
  });

  it('expone el error de la consulta', async () => {
    mockQueryResult({ data: null, error: { message: 'denied' } });

    const { result } = renderRatingsHook();

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('denied');
  });
});
