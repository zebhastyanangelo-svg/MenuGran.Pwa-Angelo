import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersStatusChart } from './OrdersStatusChart';
import type { OrderStatusTrend } from '../../services/superAdminOrderTrendsService';

const points: OrderStatusTrend[] = [
  {
    date: '2026-08-26',
    dayOffset: 2,
    counts: { delivered: 3, in_process: 1, cancelled: 0 },
  },
  {
    date: '2026-08-27',
    dayOffset: 1,
    counts: { delivered: 2, in_process: 4, cancelled: 1 },
  },
  {
    date: '2026-08-28',
    dayOffset: 0,
    counts: { delivered: 5, in_process: 0, cancelled: 2 },
  },
];

describe('OrdersStatusChart', () => {
  it('renderiza la gráfica con nombre accesible', () => {
    render(<OrdersStatusChart data={points} isLoading={false} />);
    expect(
      screen.getByLabelText('Pedidos por estado y día'),
    ).toBeInTheDocument();
  });

  it('dibuja un rectángulo por cada barra (día × grupo)', () => {
    const { container } = render(
      <OrdersStatusChart data={points} isLoading={false} />,
    );
    expect(container.querySelectorAll('rect')).toHaveLength(
      points.length * 3,
    );
  });

  it('renderiza la leyenda con los tres estados', () => {
    render(<OrdersStatusChart data={points} isLoading={false} />);
    expect(screen.getByText('Entregado')).toBeInTheDocument();
    expect(screen.getByText('En proceso')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('muestra esqueleto mientras carga', () => {
    render(<OrdersStatusChart data={[]} isLoading={true} />);
    expect(
      screen.getByLabelText(/cargando gráfica de estados de pedido/i),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay datos', () => {
    render(<OrdersStatusChart data={[]} isLoading={false} />);
    expect(screen.getByText(/Sin pedidos en los últimos 30 días/i)).toBeInTheDocument();
  });

  it('muestra el error cuando falla la consulta', () => {
    render(
      <OrdersStatusChart data={[]} isLoading={false} error="Error de red" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Error de red');
  });

  it('muestra un tooltip con la cuenta al pasar el ratón sobre una barra', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OrdersStatusChart data={points} isLoading={false} />,
    );
    const rects = container.querySelectorAll('rect');
    const lastBar = rects[rects.length - 1];
    expect(lastBar).not.toBeUndefined();
    await user.hover(lastBar);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Cancelado: 2');
  });
});
