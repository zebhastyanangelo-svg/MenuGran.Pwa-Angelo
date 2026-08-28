import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenueTrendChart } from './RevenueTrendChart';
import { formatCurrency } from '../../utils/format';
import type { RevenueTrendPoint } from '../../services/superAdminOrderTrendsService';

const points: RevenueTrendPoint[] = [
  { date: '2026-08-25', dayOffset: 3, revenue: 100 },
  { date: '2026-08-26', dayOffset: 2, revenue: 250.75 },
  { date: '2026-08-27', dayOffset: 1, revenue: 0 },
  { date: '2026-08-28', dayOffset: 0, revenue: 500 },
];

describe('RevenueTrendChart', () => {
  it('renderiza la gráfica con nombre accesible', () => {
    render(<RevenueTrendChart data={points} isLoading={false} />);
    expect(
      screen.getByLabelText('Tendencia de ingresos diarios'),
    ).toBeInTheDocument();
  });

  it('dibuja un punto (circle) por cada dato y rutas de línea y área', () => {
    const { container } = render(<RevenueTrendChart data={points} isLoading={false} />);
    expect(container.querySelectorAll('circle')).toHaveLength(points.length);
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
  });

  it('muestra etiquetas de eje Y en pesos', () => {
    render(<RevenueTrendChart data={points} isLoading={false} />);
    expect(screen.getAllByText(formatCurrency(500)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(0)).length).toBeGreaterThan(0);
  });

  it('muestra esqueleto mientras carga', () => {
    render(<RevenueTrendChart data={[]} isLoading={true} />);
    expect(
      screen.getByLabelText(/cargando gráfica de tendencias/i),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay datos', () => {
    render(<RevenueTrendChart data={[]} isLoading={false} />);
    expect(screen.getByText(/Sin pedidos en los últimos 30 días/i)).toBeInTheDocument();
  });

  it('muestra el error cuando falla la consulta', () => {
    render(
      <RevenueTrendChart data={[]} isLoading={false} error="Error de red" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Error de red');
  });

  it('muestra un tooltip con el ingreso al pasar el ratón sobre un punto', async () => {
    const user = userEvent.setup();
    const { container } = render(<RevenueTrendChart data={points} isLoading={false} />);
    const circles = container.querySelectorAll('circle');
    const lastCircle = circles[circles.length - 1];
    expect(lastCircle).not.toBeUndefined();
    await user.hover(lastCircle);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(formatCurrency(500));
  });
});
