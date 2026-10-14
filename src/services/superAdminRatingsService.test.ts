import { describe, expect, it, vi, beforeEach } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: supabaseMock,
  TABLE_NAMES: { orderRatings: 'order_ratings' },
}));

import { fetchPlatformRatingsReport } from './superAdminRatingsService';

type QueryResult = { data: unknown; error: { message: string } | null };

function mockQueryResult(result: QueryResult): void {
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
    driver_stars: 4,
    platform_stars: 5,
    platform_comment: 'Excelente servicio',
    created_at: '2026-10-01T10:00:00Z',
    merchants: [{ name: 'La Pizza' }],
    profiles: { full_name: 'María', email: 'maria@example.com' },
    ...overrides,
  };
}

describe('fetchPlatformRatingsReport', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
  });

  it('agrega el desglose de categorías y los promedios globales', async () => {
    mockQueryResult({
      data: [
        buildRow(),
        buildRow({ id: 'r-2', order_id: 'o-2', merchant_stars: 3, platform_stars: 4 }),
        buildRow({ id: 'r-3', order_id: 'o-3', merchant_stars: 1, platform_stars: 2, platform_comment: 'Muy lento' }),
      ],
      error: null,
    });

    const report = await fetchPlatformRatingsReport();

    expect(report.categories).toEqual({ total: 3, good: 1, normal: 1, bad: 1 });
    expect(report.averageMerchantStars).toBeCloseTo(3);
    expect(report.averagePlatformStars).toBeCloseTo(11 / 3);
  });

  it('construye el digest por comercio ordenado de peor a mejor promedio', async () => {
    mockQueryResult({
      data: [
        buildRow({ merchant_id: 'm-bueno', merchant_stars: 5 }),
        buildRow({ id: 'r-2', order_id: 'o-2', merchant_id: 'm-bueno', merchant_stars: 4 }),
        buildRow({ id: 'r-3', order_id: 'o-3', merchant_id: 'm-malo', merchant_stars: 2, platform_comment: null }),
      ],
      error: null,
    });

    const report = await fetchPlatformRatingsReport();

    expect(report.merchants).toHaveLength(2);
    expect(report.merchants[0].merchantId).toBe('m-malo');
    expect(report.merchants[0].average).toBeCloseTo(2);
    expect(report.merchants[1].merchantId).toBe('m-bueno');
    expect(report.merchants[1].average).toBeCloseTo(4.5);
    expect(report.merchants[1].count).toBe(2);
  });

  it('expone la interacción con cliente, comercio y comentario', async () => {
    mockQueryResult({ data: [buildRow()], error: null });

    const report = await fetchPlatformRatingsReport();

    expect(report.interactions).toHaveLength(1);
    const interaction = report.interactions[0];
    expect(interaction.merchantName).toBe('La Pizza');
    expect(interaction.customerName).toBe('María');
    expect(interaction.customerEmail).toBe('maria@example.com');
    expect(interaction.comment).toBe('Excelente servicio');
    expect(interaction.category).toBe('good');
  });

  it('lanza error cuando la consulta falla', async () => {
    mockQueryResult({ data: null, error: { message: 'RLS denied' } });

    await expect(fetchPlatformRatingsReport()).rejects.toThrow('RLS denied');
  });

  it('devuelve un reporte vacío sin valoraciones', async () => {
    mockQueryResult({ data: [], error: null });

    const report = await fetchPlatformRatingsReport();

    expect(report.categories.total).toBe(0);
    expect(report.merchants).toHaveLength(0);
    expect(report.interactions).toHaveLength(0);
  });
});
