import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuperAdminRatingsPage } from './SuperAdminRatingsPage';
import type { MerchantRatingDigest, RatingInteraction } from '../../services/superAdminRatingsService';

vi.mock('../../hooks/useSuperAdminRatings', () => ({
  useSuperAdminRatings: vi.fn(),
}));

import { useSuperAdminRatings } from '../../hooks/useSuperAdminRatings';

const mockHook = vi.mocked(useSuperAdminRatings);

function buildInteraction(overrides: Partial<RatingInteraction> = {}): RatingInteraction {
  return {
    id: 'r-1',
    orderId: 'o-1',
    merchantId: 'm-1',
    merchantName: 'La Pizza',
    customerId: 'c-1',
    customerName: 'María',
    customerEmail: 'maria@example.com',
    merchantStars: 5,
    driverStars: 4,
    platformStars: 5,
    category: 'good',
    comment: 'Excelente servicio',
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

function buildMerchant(overrides: Partial<MerchantRatingDigest> = {}): MerchantRatingDigest {
  return {
    merchantId: 'm-1',
    merchantName: 'La Pizza',
    average: 4.6,
    count: 5,
    good: 4,
    normal: 1,
    bad: 0,
    ...overrides,
  };
}

function baseReturn(overrides: Record<string, unknown> = {}) {
  return {
    categories: { total: 10, good: 7, normal: 2, bad: 1 },
    averageMerchantStars: 4.2,
    averagePlatformStars: 4.5,
    merchants: [buildMerchant()],
    interactions: [buildInteraction()],
    isLoading: false,
    error: null,
    categoryFilter: 'all' as const,
    setCategoryFilter: vi.fn(),
    merchantFilter: 'all',
    setMerchantFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    ...overrides,
  };
}

describe('SuperAdminRatingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el resumen global con las tres categorías y el total', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminRatingsPage />);

    expect(screen.getByRole('heading', { name: /Votaciones/i })).toBeInTheDocument();
    expect(screen.getByTestId('ratings-total')).toHaveTextContent('10');
    expect(screen.getByTestId('ratings-count-good')).toHaveTextContent('7');
    expect(screen.getByTestId('ratings-count-normal')).toHaveTextContent('2');
    expect(screen.getByTestId('ratings-count-bad')).toHaveTextContent('1');
    expect(screen.getAllByTestId('rating-distribution-bar').length).toBeGreaterThan(0);
  });

  it('lista la reputación por comercio ordenada con su barra de distribución', () => {
    mockHook.mockReturnValue(
      baseReturn({
        merchants: [
          buildMerchant({ merchantId: 'm-malo', merchantName: 'El Arepazo', average: 2.3, bad: 3 }),
          buildMerchant(),
        ],
      }),
    );

    render(<SuperAdminRatingsPage />);

    expect(screen.getAllByText('El Arepazo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('La Pizza').length).toBeGreaterThan(0);
  });

  it('muestra el listado de interacciones con cliente, estrellas y comentario', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminRatingsPage />);

    expect(screen.getByTestId('ratings-interactions-list')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.getByText(/Excelente servicio/)).toBeInTheDocument();
    expect(screen.getByText(/Repartidor: 4 ★/)).toBeInTheDocument();
  });

  it('aplica filtros de categoría y búsqueda', () => {
    const setCategoryFilter = vi.fn();
    const setSearchQuery = vi.fn();
    mockHook.mockReturnValue(
      baseReturn({ setCategoryFilter, setSearchQuery, interactions: [] }),
    );

    render(<SuperAdminRatingsPage />);

    fireEvent.click(screen.getByRole('tab', { name: /Malas \(1-2/ }));
    expect(setCategoryFilter).toHaveBeenCalledWith('bad');

    fireEvent.change(screen.getByTestId('ratings-search'), {
      target: { value: 'queja' },
    });
    expect(setSearchQuery).toHaveBeenCalledWith('queja');

    expect(screen.getByTestId('ratings-no-interactions')).toBeInTheDocument();
  });

  it('filtra por comercio desde el selector', () => {
    const setMerchantFilter = vi.fn();
    mockHook.mockReturnValue(baseReturn({ setMerchantFilter }));

    render(<SuperAdminRatingsPage />);

    fireEvent.change(screen.getByTestId('ratings-merchant-filter'), {
      target: { value: 'm-1' },
    });
    expect(setMerchantFilter).toHaveBeenCalledWith('m-1');
  });

  it('muestra el estado de carga y de error', () => {
    mockHook.mockReturnValue(
      baseReturn({ isLoading: true, categories: null, merchants: [], interactions: [] }),
    );
    const { unmount } = render(<SuperAdminRatingsPage />);
    expect(screen.getByTestId('ratings-loading')).toBeInTheDocument();
    unmount();

    mockHook.mockReturnValue(baseReturn({ error: 'Acceso denegado' }));
    render(<SuperAdminRatingsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado');
  });

  it('marca los comercios con malas votaciones y muestra su detalle seleccionado', () => {
    const setMerchantFilter = vi.fn();
    mockHook.mockReturnValue(
      baseReturn({
        setMerchantFilter,
        merchantFilter: 'm-1',
        merchants: [buildMerchant({ bad: 2 })],
      }),
    );

    render(<SuperAdminRatingsPage />);

    expect(screen.getByText('2 malas')).toBeInTheDocument();
    expect(screen.getByTestId('ratings-merchant-selected')).toBeInTheDocument();
    expect(screen.getByText(/Requiere revisión/)).toBeInTheDocument();
  });

  it('responde a cambios de filtro con act sin advertencias', () => {
    const setCategoryFilter = vi.fn();
    mockHook.mockReturnValue(baseReturn({ setCategoryFilter }));

    render(<SuperAdminRatingsPage />);

    act(() => {
      fireEvent.click(screen.getByRole('tab', { name: /Buenas \(4-5/ }));
    });
    expect(setCategoryFilter).toHaveBeenCalledWith('good');
  });
});
