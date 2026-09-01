import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { GeoPoint, MerchantRow } from '../types/database';
import { MarketplacePage } from './MarketplacePage';

const mocks = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
  navigateMock: vi.fn(),
  getCurrentGeoPointMock: vi.fn(),
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
  supabase: mocks.supabaseMock,
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn(), hideToast: vi.fn(), toasts: [] }),
}));

vi.mock('../utils/geolocation', () => ({
  isGeolocationSupported: () => true,
  getCurrentGeoPoint: () => mocks.getCurrentGeoPointMock(),
  resolveGeolocationErrorMessage: (err: unknown) => {
    if (err !== null && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: number }).code;
      if (code === 1) return 'Permiso de ubicación denegado.';
    }
    return 'No se pudo obtener tu ubicación.';
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock,
  };
});

function buildMerchant(
  id: string,
  name: string,
  location: GeoPoint | null = null,
): MerchantRow {
  return {
    id,
    owner_id: 'owner-1',
    name,
    slug: name.toLowerCase().replace(/\s/g, '-'),
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    location,
    is_active: true,
    is_open: true,
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

function mockTableResults(
  results: Record<string, { data: unknown[] | null; error: unknown }>,
) {
  mocks.supabaseMock.from = vi.fn((table: string) => {
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

const userLocation: GeoPoint = { x: -66.9036, y: 10.4806 };

describe('MarketplacePage', () => {
  beforeEach(() => {
    mocks.supabaseMock.from = vi.fn();
    mocks.navigateMock.mockReset();
    mocks.getCurrentGeoPointMock.mockReset();
  });

  it('muestra los comercios tras cargar los datos', async () => {
    mocks.getCurrentGeoPointMock.mockRejectedValue(new Error('no gps'));
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
    mocks.getCurrentGeoPointMock.mockRejectedValue(new Error('no gps'));
    mockTableResults({
      merchants: { data: [], error: null },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/No se encontraron comercios/i),
    ).toBeInTheDocument();
  });

  it('muestra mensaje de error y botón para reintentar', async () => {
    mocks.getCurrentGeoPointMock.mockRejectedValue(new Error('no gps'));
    mockTableResults({
      merchants: { data: null, error: { message: 'fallo de red' } },
    });

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Ocurrió un error al cargar la información/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });

  it('navega al detalle del comercio al hacer clic en la tarjeta', async () => {
    mocks.getCurrentGeoPointMock.mockRejectedValue(new Error('no gps'));
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

    expect(mocks.navigateMock).toHaveBeenCalledWith('/merchant/m1');
  });

  describe('filtrado por geolocalización', () => {
    it('solo muestra comercios dentro de 1 km cuando GPS está disponible', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);
      const cerca = buildMerchant('m1', 'Cerca', { x: -66.904, y: 10.481 });
      const lejos = buildMerchant('m2', 'Lejos', { x: -66.92, y: 10.5 });
      mockTableResults({
        merchants: { data: [cerca, lejos], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Cerca')).toBeInTheDocument();
      expect(screen.queryByText('Lejos')).not.toBeInTheDocument();
    });

    it('muestra comercios sin location (null) incluidos en el filtro cercano', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);
      const sinLocation = buildMerchant('m1', 'Sin GPS', null);
      mockTableResults({
        merchants: { data: [sinLocation], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Sin GPS')).toBeInTheDocument();
    });

    it('muestra todos los comercios cuando el usuario deniega el GPS', async () => {
      mocks.getCurrentGeoPointMock.mockRejectedValue({ code: 1 });
      const cerca = buildMerchant('m1', 'Cerca', { x: -66.904, y: 10.481 });
      const lejos = buildMerchant('m2', 'Lejos', { x: -66.92, y: 10.5 });
      mockTableResults({
        merchants: { data: [cerca, lejos], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Cerca')).toBeInTheDocument();
      expect(screen.getByText('Lejos')).toBeInTheDocument();
    });

    it('el toggle cambia entre "Cercanos" y "Ver todos"', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);
      const cerca = buildMerchant('m1', 'Cerca', { x: -66.904, y: 10.481 });
      const lejos = buildMerchant('m2', 'Lejos', { x: -66.92, y: 10.5 });
      mockTableResults({
        merchants: { data: [cerca, lejos], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      await screen.findByText('Cerca');
      expect(screen.queryByText('Lejos')).not.toBeInTheDocument();

      const toggle = screen.getByTestId('nearby-toggle');
      fireEvent.click(toggle);

      expect(screen.getByText('Lejos')).toBeInTheDocument();

      fireEvent.click(toggle);
      await waitFor(() => {
        expect(screen.queryByText('Lejos')).not.toBeInTheDocument();
      });
    });

    it('muestra badge de distancia en las tarjetas', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);
      const merchant = buildMerchant('m1', 'Mi Negocio', {
        x: -66.904,
        y: 10.481,
      });
      mockTableResults({
        merchants: { data: [merchant], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      await screen.findByText('Mi Negocio');
      expect(screen.getByText(/km$/)).toBeInTheDocument();
    });

    it('muestra aviso de error de GPS y botón para cerrar', async () => {
      mocks.getCurrentGeoPointMock.mockRejectedValue({ code: 1 });
      mockTableResults({
        merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      await screen.findByText(/Permiso de ubicación denegado/i);
      const closeBtn = screen.getByRole('button', { name: /Cerrar aviso/i });
      fireEvent.click(closeBtn);
      expect(
        screen.queryByText(/Permiso de ubicación denegado/i),
      ).not.toBeInTheDocument();
    });

    it('no muestra el toggle cuando no hay GPS', async () => {
      mocks.getCurrentGeoPointMock.mockRejectedValue(new Error('no support'));
      mockTableResults({
        merchants: { data: [buildMerchant('m1', 'La Esquina')], error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      await screen.findByText('La Esquina');
      expect(screen.queryByTestId('nearby-toggle')).not.toBeInTheDocument();
    });

    it('no colapsa cuando los comercios tienen location malformados', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);

      const malformedMerchants = [
        buildMerchant('m1', 'Sin Location', null),
        // Simula location con coordenadas undefined (dato corrupto de DB)
        { ...buildMerchant('m2', 'Coord Undefined'), location: { x: undefined, y: undefined } } as unknown as MerchantRow,
        // Simula location con NaN
        { ...buildMerchant('m3', 'Coord NaN'), location: { x: NaN, y: NaN } } as unknown as MerchantRow,
        // Simula location que es un objeto vacío
        { ...buildMerchant('m4', 'Obj Vacío'), location: {} } as unknown as MerchantRow,
        // Comercio válido que debe renderizarse correctamente
        buildMerchant('m5', 'Válido', { x: -66.904, y: 10.481 }),
      ];

      mockTableResults({
        merchants: { data: malformedMerchants, error: null },
      });

      render(
        <MemoryRouter>
          <MarketplacePage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Sin Location')).toBeInTheDocument();
      expect(screen.getByText('Coord Undefined')).toBeInTheDocument();
      expect(screen.getByText('Coord NaN')).toBeInTheDocument();
      expect(screen.getByText('Obj Vacío')).toBeInTheDocument();
      expect(screen.getByText('Válido')).toBeInTheDocument();
    });

    it('no colapsa cuando el location de un comercio es undefined', async () => {
      mocks.getCurrentGeoPointMock.mockResolvedValue(userLocation);

      const merchants = [
        { ...buildMerchant('m1', 'Broken'), location: undefined } as unknown as MerchantRow,
        buildMerchant('m2', 'OK', { x: -66.904, y: 10.481 }),
      ];

      mockTableResults({
        merchants: { data: merchants, error: null },
      });

      expect(() => {
        render(
          <MemoryRouter>
            <MarketplacePage />
          </MemoryRouter>,
        );
      }).not.toThrow();

      expect(await screen.findByText('Broken')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });
});
