import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MerchantRow } from '../types/database';
import { MarketplacePage } from './MarketplacePage';

const authMocks = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
}));

vi.mock('../services/supabase', () => ({
  TABLE_NAMES: {
    merchants: 'merchants',
    categories: 'categories',
    products: 'products',
    profiles: 'profiles',
    merchantStaff: 'merchant_staff',
    orders: 'orders',
    deliveries: 'deliveries',
  },
  supabase: authMocks.supabaseMock,
}));

function buildMerchant(id: string, name: string): MerchantRow {
  return {
    id,
    owner_id: 'owner-1',
    name,
    slug: name.toLowerCase().replace(/\s/g, '-'),
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    location: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function mockTableResults(results: Record<string, { data: unknown[] | null; error: unknown }>) {
  authMocks.supabaseMock.from = vi.fn((table: string) => {
    const result = results[table] ?? { data: [], error: null };
    const query: any = {
      select: () => query,
      eq: () => query,
      order: () => query,
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return query;
  });
}

describe('MarketplacePage', () => {
  beforeEach(() => {
    authMocks.supabaseMock.from = vi.fn();
  });

  it('muestra los comercios tras cargar los datos', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    render(<MarketplacePage />);

    expect(await screen.findByText('La Esquina')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay comercios', async () => {
    mockTableResults({
      merchants: { data: [], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    render(<MarketplacePage />);

    expect(
      await screen.findByText(/No se encontraron comercios/i),
    ).toBeInTheDocument();
  });

  it('muestra mensaje de error y botón para reintentar', async () => {
    mockTableResults({
      merchants: { data: null, error: { message: 'fallo de red' } },
      categories: { data: null, error: { message: 'fallo de red' } },
      products: { data: null, error: { message: 'fallo de red' } },
    });

    render(<MarketplacePage />);

    expect(
      await screen.findByText(/Ocurrió un error al cargar la información/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });
});