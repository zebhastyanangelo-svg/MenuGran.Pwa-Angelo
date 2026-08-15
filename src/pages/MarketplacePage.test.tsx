import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MerchantRow } from '../types/database';
import { MarketplacePage } from './MarketplacePage';

const authMocks = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
  navigateMock: vi.fn(),
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

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn(), toasts: [] }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => authMocks.navigateMock,
  };
});

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
    const query: {
      select: () => typeof query;
      eq: () => typeof query;
      order: () => typeof query;
      single: () => typeof query;
      then: (resolve: (v: unknown) => unknown) => void;
    } = {
      select: () => query,
      eq: () => query,
      order: () => query,
      single: () => query,
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return query;
  });
}

const localStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => (key in localStore ? localStore[key] : null),
  setItem: (key: string, value: string) => {
    localStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete localStore[key];
  },
  clear: () => {
    for (const key of Object.keys(localStore)) delete localStore[key];
  },
};

describe('MarketplacePage', () => {
  beforeEach(() => {
    authMocks.supabaseMock.from = vi.fn();
    authMocks.navigateMock.mockReset();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    localStorageMock.clear();
  });

  it('muestra los comercios tras cargar los datos', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('La Esquina')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay comercios', async () => {
    mockTableResults({
      merchants: { data: [], error: null },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No se encontraron comercios/i)).toBeInTheDocument();
  });

  it('muestra mensaje de error y botón para reintentar', async () => {
    mockTableResults({
      merchants: { data: null, error: { message: 'fallo de red' } },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Ocurrió un error al cargar la información/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });

  it('navega al detalle del comercio al hacer clic en la tarjeta', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    const merchant = await screen.findByText('La Esquina');
    const card = merchant.closest('[role="button"]');
    fireEvent.click(card!);

    expect(authMocks.navigateMock).toHaveBeenCalledWith('/merchant/m1');
  });
});
