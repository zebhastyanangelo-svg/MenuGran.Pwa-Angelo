import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { MerchantRow, ProductRow } from '../types/database';
import { MarketplacePage } from './MarketplacePage';
import { CartProvider } from '../context/CartContext';

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

function buildProduct(id: string, title: string, categoryId: string): ProductRow {
  return {
    id,
    merchant_id: 'merchant-1',
    category_id: categoryId,
    title,
    description: `Descripción de ${title}`,
    price: '12.50',
    image_url: null,
    is_available: true,
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

function renderWithProviders(ui: React.ReactNode) {
  return render(<CartProvider>{ui}</CartProvider>);
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
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    localStorageMock.clear();
  });

  it('muestra los comercios tras cargar los datos', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(<MarketplacePage />);

    expect(await screen.findByText('La Esquina')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay comercios', async () => {
    mockTableResults({
      merchants: { data: [], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(<MarketplacePage />);

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

    renderWithProviders(<MarketplacePage />);

    expect(
      await screen.findByText(/Ocurrió un error al cargar la información/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });

  it('abre el detalle del producto, agrega al carrito y cierra el modal', async () => {
    mockTableResults({
      merchants: { data: [], error: null },
      categories: { data: [{ id: 'cat-1', merchant_id: 'merchant-1', name: 'Platillos', sort_order: 1, created_at: '2026-01-01T00:00:00.000Z' }], error: null },
      products: { data: [buildProduct('p1', 'Hamburguesa', 'cat-1')], error: null },
    });

    renderWithProviders(<MarketplacePage />);

    fireEvent.click(await screen.findByRole('tab', { name: /Productos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ver producto Hamburguesa/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Platillos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Agregar al carrito/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('menugram_cart') ?? '[]').length).toBe(1);
  });
});
