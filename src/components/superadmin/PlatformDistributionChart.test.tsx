import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformDistributionChart } from './PlatformDistributionChart';
import type { SuperAdminMetrics } from '../../services/superAdminMetricsService';

const metrics: SuperAdminMetrics = {
  totalMerchants: 7,
  totalCustomers: 42,
  totalOrders: 120,
};

describe('PlatformDistributionChart', () => {
  it('se renderiza sin errores con métricas cargadas', () => {
    render(<PlatformDistributionChart metrics={metrics} isLoading={false} />);

    expect(
      screen.getByLabelText('Gráfica de dona distribución de la plataforma'),
    ).toBeInTheDocument();
  });

  it('muestra el total combinado en el centro de la dona', () => {
    render(<PlatformDistributionChart metrics={metrics} isLoading={false} />);

    expect(screen.getByText('169')).toBeInTheDocument();
  });

  it('renderiza la leyenda interactiva con las tres categorías', () => {
    render(<PlatformDistributionChart metrics={metrics} isLoading={false} />);

    expect(screen.getByRole('button', { name: /Comercios registrados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usuarios registrados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedidos totales/i })).toBeInTheDocument();
  });

  it('oculta un segmento al pulsar su leyenda y lo vuelve a mostrar al volver a pulsar', async () => {
    const user = userEvent.setup();
    render(<PlatformDistributionChart metrics={metrics} isLoading={false} />);

    const firstLegendButton = screen.getByRole('button', {
      name: /Comercios registrados/i,
    });
    const beforeCount = screen.getAllByRole('img', {
      name: /Comercios registrados/i,
    }).length;

    await user.click(firstLegendButton);

    expect(
      screen.queryByRole('img', { name: /Comercios registrados/i }),
    ).not.toBeInTheDocument();
    expect(beforeCount).toBeGreaterThan(0);

    await user.click(firstLegendButton);
    expect(
      screen.getByRole('img', { name: /Comercios registrados/i }),
    ).toBeInTheDocument();
  });

  it('moestra un tooltip al pasar el ratón sobre un segmento', async () => {
    const user = userEvent.setup();
    render(<PlatformDistributionChart metrics={metrics} isLoading={false} />);

    const segment = screen.getByLabelText('Pedidos totales: 120');
    await user.hover(segment);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Pedidos totales: 120',
    );
  });

  it('muestra esqueletos mientras carga', () => {
    const { container } = render(
      <PlatformDistributionChart metrics={null} isLoading={true} />,
    );

    expect(screen.getByLabelText(/cargando gráfica/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });
});
