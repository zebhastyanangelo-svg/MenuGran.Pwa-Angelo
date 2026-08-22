import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage';

vi.mock('../../hooks/useSuperAdminMetrics', () => ({
  useSuperAdminMetrics: vi.fn(),
}));

import { useSuperAdminMetrics } from '../../hooks/useSuperAdminMetrics';

const mockHook = vi.mocked(useSuperAdminMetrics);

describe('SuperAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza las tres tarjetas de métricas globales con sus valores', () => {
    mockHook.mockReturnValue({
      metrics: { totalMerchants: 7, totalCustomers: 42, totalOrders: 120 },
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

  it('muestra ceros cuando aún no hay métricas', () => {
    mockHook.mockReturnValue({ metrics: null, isLoading: false, error: null });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByTestId('metric-Comercios registrados')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-Pedidos globales')).toHaveTextContent('0');
  });

  it('muestra estado de carga mientras se consultan las métricas', () => {
    mockHook.mockReturnValue({
      metrics: null,
      isLoading: true,
      error: null,
    });

    render(<SuperAdminDashboardPage />);

    expect(screen.getByText(/Cargando métricas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Métricas de la plataforma/i)).not.toBeInTheDocument();
  });

  it('muestra un mensaje de error sin romper la vista', () => {
    mockHook.mockReturnValue({
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
