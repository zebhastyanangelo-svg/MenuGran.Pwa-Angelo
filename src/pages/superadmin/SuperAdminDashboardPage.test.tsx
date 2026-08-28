import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage';

vi.mock('../../hooks/useSuperAdminMetrics', () => ({
  useSuperAdminMetrics: vi.fn(),
}));
vi.mock('../../hooks/useSuperAdminOrderTrends', () => ({
  useSuperAdminOrderTrends: vi.fn(),
}));

import { useSuperAdminMetrics } from '../../hooks/useSuperAdminMetrics';
import { useSuperAdminOrderTrends } from '../../hooks/useSuperAdminOrderTrends';

const mockMetricsHook = vi.mocked(useSuperAdminMetrics);
const mockTrendsHook = vi.mocked(useSuperAdminOrderTrends);

const loadedMetrics = {
  totalMerchants: 7,
  totalCustomers: 42,
  totalOrders: 120,
};
const loadedTrends = {
  revenueTrend: [{ date: '2026-08-28', dayOffset: 0, revenue: 1000 }],
  ordersStatusTrend: [
    {
      date: '2026-08-28',
      dayOffset: 0,
      counts: { delivered: 5, in_process: 2, cancelled: 1 },
    },
  ],
  isLoading: false,
  error: null,
};

describe('SuperAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrendsHook.mockReturnValue(loadedTrends);
  });

  it('renderiza las tres tarjetas de métricas globales con sus valores', () => {
    mockMetricsHook.mockReturnValue({
      metrics: loadedMetrics,
      isLoading: false,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(
      screen.getByRole('heading', { name: /Métricas Globales/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('metric-Comercios registrados')).toHaveTextContent('7');
    expect(screen.getByTestId('metric-Usuarios clientes')).toHaveTextContent('42');
    expect(screen.getByTestId('metric-Pedidos globales')).toHaveTextContent('120');
  });

  it('renderiza las tres gráficas al cargar métricas y tendencias', () => {
    mockMetricsHook.mockReturnValue({
      metrics: loadedMetrics,
      isLoading: false,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByText('Distribución global de la plataforma')).toBeInTheDocument();
    expect(screen.getByText('Tendencia de ingresos (últimos 30 días)')).toBeInTheDocument();
    expect(screen.getByText('Pedidos por estado (últimos 30 días)')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Tendencia de ingresos diarios'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Pedidos por estado y día')).toBeInTheDocument();
  });

  it('muestra esqueletos de gráficas mientras cargan las tendencias', () => {
    mockMetricsHook.mockReturnValue({
      metrics: loadedMetrics,
      isLoading: false,
      error: null,
    });
    mockTrendsHook.mockReturnValue({
      revenueTrend: [],
      ordersStatusTrend: [],
      isLoading: true,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(
      screen.getByLabelText(/cargando gráfica de tendencias/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/cargando gráfica de estados de pedido/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Tendencia de ingresos diarios'),
    ).not.toBeInTheDocument();
  });

  it('muestra ceros cuando aún no hay métricas', () => {
    mockMetricsHook.mockReturnValue({ metrics: null, isLoading: false, error: null });
    mockTrendsHook.mockReturnValue({
      revenueTrend: [],
      ordersStatusTrend: [],
      isLoading: false,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByTestId('metric-Comercios registrados')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-Pedidos globales')).toHaveTextContent('0');
    expect(
      screen.queryByLabelText(/Gráficas de métricas/i),
    ).not.toBeInTheDocument();
  });

  it('muestra estado de carga mientras se consultan las métricas', () => {
    mockMetricsHook.mockReturnValue({
      metrics: null,
      isLoading: true,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByText(/Cargando métricas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Métricas de la plataforma/i)).not.toBeInTheDocument();
  });

  it('muestra un mensaje de error sin romper la vista', () => {
    mockMetricsHook.mockReturnValue({
      metrics: null,
      isLoading: false,
      error: 'Error al contar orders: rls denied',
    });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error al contar orders: rls denied',
    );
  });
});
