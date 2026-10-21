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
    is_open: true,
    // Horario todo el día: la insignia ahora usa la misma función que el
    // marketplace (interruptores manuales + agenda), así que el fixture
    // necesita un rango válido para que "Abierto" no dependa de la hora.
    opening_time: '00:00',
    closing_time: '23:59',
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-12345678-0',
    category: 'Restaurante',
    description: 'Descripción',
    address: 'Dirección',
    zone: null,
    phone_whatsapp: '+58 412-123-4567',
    service_modalities: ['Comer en el local'],
    business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
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

     expect(await screen.findByText(/Aún no hay platillos disponibles/i)).toBeInTheDocument();
   });

    it('muestra la etiqueta Abierto cuando is_open es true y el horario lo permite', async () => {
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

      expect(await screen.findByText('Abierto')).toBeInTheDocument();
    });

    it('muestra Cerrado cuando la agenda semanal cierra el día aunque is_open sea true', async () => {
      // Regresión de la sincronización marketplace/perfil: antes la página
      // del comercio sólo miraba los interruptores manuales y mostraba
      // "Abierto" aunque la tarjeta del marketplace dijera "Cerrado".
      const closedAllWeek = Object.fromEntries(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
          (day) => [day, { is_open: false, open_time: '08:00', close_time: '20:00' }],
        ),
      );
      const merchant = {
        ...buildMerchant('merchant-1', 'La Esquina'),
        weekly_hours: { timezone: 'America/Caracas', schedule: closedAllWeek },
      };
      mockTableResults({
        merchants: { data: [merchant], error: null },
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

      // La insignia de estado (badgeLabel) y el horario del día (todayLabel)
      // renderizan "Cerrado" a la vez cuando la agenda cierra el día:
      // acotamos la búsqueda con findAllByText y el testid del horario en
      // lugar de exigir un único nodo con ese texto.
      const cerradoElements = await screen.findAllByText('Cerrado');
      expect(cerradoElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('store-schedule')).toHaveTextContent('Cerrado');
      expect(screen.queryByText('Abierto')).not.toBeInTheDocument();
    });

   it('muestra la etiqueta Cerrado cuando is_open es false', async () => {
     const closedMerchant = { ...buildMerchant('merchant-1', 'La Esquina'), is_open: false };
     mockTableResults({
       merchants: { data: [closedMerchant], error: null },
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

     expect(await screen.findByText('Cerrado')).toBeInTheDocument();
   });

   it('muestra la categoría y zona del comercio', async () => {
     const zonedMerchant = {
       ...buildMerchant('merchant-1', 'La Esquina'),
       category: 'Postres',
       zone: 'Laureles',
     };
     mockTableResults({
       merchants: { data: [zonedMerchant], error: null },
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

     expect(await screen.findByText('La Esquina')).toBeInTheDocument();
     expect(screen.getByText('Postres')).toBeInTheDocument();
     expect(screen.getByText('Laureles')).toBeInTheDocument();
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

    // El resultado observable del error es el respaldo visual actual: el
    // gradiente con las iniciales del comercio (nodo aria-hidden dentro
    // del círculo del logo). Acotamos la consulta a ese nodo en lugar de
    // buscar un texto estricto global, y si el evento no surte efecto de
    // inmediato (imagen obsoleta o relanzamiento del componente) se
    // reintenta sobre el <img> presente en el DOM.
    await waitFor(
      () => {
        const fallback = screen.queryByText(
          (_, element) =>
            element !== null &&
            element.tagName === 'DIV' &&
            element.getAttribute('aria-hidden') === 'true',
        );
        if (fallback === null) {
          const currentImg = screen.queryByAltText('Logo de La Esquina');
          if (currentImg !== null) {
            fireEvent.error(currentImg);
          }
          expect(fallback).not.toBeNull();
          return;
        }
        expect(fallback).toHaveTextContent('L');
      },
      { timeout: 5000 },
    );
  });
  it('muestra los chips de promocion configurados por el comercio', async () => {
    mockTableResults({
      merchants: {
        data: [
          {
            ...buildMerchant('merchant-1', 'La Esquina'),
            discount_percentage: 20,
            promo_label: '2x1',
          },
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

    expect(await screen.findByTestId('store-promo-chips')).toBeInTheDocument();
    expect(screen.getByText('20% OFF')).toBeInTheDocument();
    expect(screen.getByText('2x1')).toBeInTheDocument();
  });

  it('no muestra chips cuando el comercio no tiene promociones', async () => {
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
    expect(screen.queryByTestId('store-promo-chips')).not.toBeInTheDocument();
  });

  it('muestra el tiempo estimado del comercio junto al reloj', async () => {
    mockTableResults({
      merchants: {
        data: [
          {
            ...buildMerchant('merchant-1', 'La Esquina'),
            estimated_delivery_minutes: 25,
          },
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

    expect(await screen.findByTestId('store-eta')).toHaveTextContent('25-35 min');
  });

  it('renderiza las subcategorias como pestanas fijas', async () => {
    mockTableResults({
      merchants: { data: [buildMerchant('merchant-1', 'La Esquina')], error: null },
      categories: { data: [buildCategory('cat-1', 'Pizzas')], error: null },
      products: { data: [], error: null },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/merchant/merchant-1']}>
        <Routes>
          <Route path="/merchant/:merchantId" element={<MerchantStorePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const tab = await screen.findByRole('tab', { name: /Pizzas/i });
    expect(tab).toBeInTheDocument();
    expect(tab.closest('[role="tablist"]')).toHaveClass('sticky');
  });
});
