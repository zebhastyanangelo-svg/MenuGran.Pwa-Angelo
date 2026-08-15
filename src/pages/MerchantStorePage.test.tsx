import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { CategoryRow, MerchantRow, ProductRow } from '../types/database';
import { MerchantStorePage } from './MerchantStorePage';
import { CartProvider } from '../context/CartContext';

const authMocks = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
  showToastMock: vi.fn(),
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
  useToast: () => ({ showToast: authMocks.showToastMock, hideToast: vi.fn(), toasts: [] }),
}));

function buildMerchant(
  id: string,
  name: string,
  logo_url: string | null = null,
  banner_url: string | null = null,
): MerchantRow {
  return {
    id,
    owner_id: 'owner-1',
    name,
    slug: name.toLowerCase().replace(/\s/g, '-'),
    logo_url,
    banner_url,
    status: 'active',
    verification_docs: {},
    location: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function buildCategory(id: string, name: string): CategoryRow {
  return {
    id,
    merchant_id: 'merchant-1',
    name,
    sort_order: 1,
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

type TableResult = { data: unknown; error: unknown };

function mockTableResults(results: Record<string, TableResult>) {
  authMocks.supabaseMock.from = vi.fn((table: string) => {
    const result = results[table] ?? { data: [], error: null };
    const isSingle = table === 'merchants';
    const resolvedData = isSingle
      ? (Array.isArray(result.data) ? result.data[0] ?? null : result.data)
      : result.data;
    const resolved: TableResult = { data: resolvedData, error: result.error };
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
      then: (resolve: (v: unknown) => unknown) => resolve(resolved),
    };
    return query;
  });
}

const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

function renderWithProviders(ui: React.ReactNode) {
  return render(<CartProvider>{ui}</CartProvider>);
}

describe('MerchantStorePage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockReset();
  });

  it('muestra el nombre del comercio y sus categorías tras cargar', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [buildCategory('cat-1', 'Platillos')], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('La Esquina')).toBeInTheDocument();
    expect(await screen.findByText('Platillos')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay productos', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No se encontraron platillos/i)).toBeInTheDocument();
  });

  it('muestra mensaje de error al fallar la carga', async () => {
    mockTableResults({
      merchants: { data: null, error: { message: 'fallo de red' } },
      categories: { data: null, error: { message: 'fallo de red' } },
      products: { data: null, error: { message: 'fallo de red' } },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Ocurrió un error al cargar el comercio/i)).toBeInTheDocument();
  });

  it('navega de vuelta al marketplace al hacer clic en Volver a comercios', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
          <Route path="/marketplace" element={<div data-testid="marketplace-page" />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('La Esquina');

    fireEvent.click(screen.getByRole('button', { name: /Volver a comercios/i }));

    expect(screen.getByTestId('marketplace-page')).toBeInTheDocument();
  });

  it('agrega un producto al carrito y muestra toast de éxito', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [buildCategory('cat-1', 'Platillos')], error: null },
      products: { data: [buildProduct('p1', 'Hamburguesa', 'cat-1')], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const productCard = await screen.findByText('Hamburguesa');
    await fireEvent.click(productCard);

    await waitFor(() => {
      expect(authMocks.showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Producto agregado',
          variant: 'success',
        }),
      );
    });
  });

  it('muestra toast de carrito actualizado al agregar producto de otro comercio', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [buildCategory('cat-1', 'Platillos')], error: null },
      products: { data: [buildProduct('p1', 'Hamburguesa', 'cat-1')], error: null },
    });

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify([{ product: { id: 'p-old', merchant_id: 'other-merchant', price: '10.00', title: 'Old' }, quantity: 1 }]),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const productCard = await screen.findByText('Hamburguesa');
    await fireEvent.click(productCard);

    await waitFor(() => {
      expect(authMocks.showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Carrito actualizado',
          message: expect.stringContaining('Hamburguesa'),
          variant: 'info',
        }),
      );
    });
  });

  it('muestra el logo y el banner del comercio cuando están definidos', async () => {
    mockTableResults({
      merchants: {
        data: [
          buildMerchant('merchant-1', 'La Esquina', 'https://i.ibb.co/logo.png', 'https://i.ibb.co/banner.jpg'),
        ],
        error: null,
      },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByAltText('Logo de La Esquina')).toHaveAttribute(
      'src',
      'https://i.ibb.co/logo.png',
    );
    expect(screen.getByAltText('Banner de La Esquina')).toHaveAttribute(
      'src',
      'https://i.ibb.co/banner.jpg',
    );
  });

  it('muestra el placeholder del logo cuando logo_url es null', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('La Esquina');
    expect(screen.queryByAltText(/Logo de/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/Banner de/i)).not.toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('muestra el placeholder cuando logo_url y banner_url están vacíos', async () => {
    mockTableResults({
      merchants: {
        data: [buildMerchant('merchant-1', 'La Esquina', '', '')],
        error: null,
      },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('La Esquina');
    expect(screen.queryByAltText(/Logo de/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/Banner de/i)).not.toBeInTheDocument();
  });

  it('muestra el placeholder del logo si la imagen falla al cargar (onError)', async () => {
    mockTableResults({
      merchants: {
        data: [
          buildMerchant(
            'merchant-1',
            'La Esquina',
            'https://i.ibb.co/logo-roto.png',
            'https://i.ibb.co/banner-roto.jpg',
          ),
        ],
        error: null,
      },
      categories: { data: [], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const logoImg = await screen.findByAltText('Logo de La Esquina');
    expect(logoImg).toBeInTheDocument();

    fireEvent.error(logoImg);

    await waitFor(() => {
      expect(screen.queryByAltText('Logo de La Esquina')).not.toBeInTheDocument();
    });
    expect(screen.getByText('L')).toBeInTheDocument();
  });
});
