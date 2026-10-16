import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import type { OrderBoardKpis } from '../../utils/orderBoard';
import { OrdersKpiGrid } from './OrdersKpiGrid';

const KPIS: OrderBoardKpis = {
  pendingPayment: { count: 3, usd: 450, ves: 4500 },
  kitchen: { total: 4, inProgress: 2, queued: 2 },
  dispatch: { total: 2, ready: 1, onTheWay: 1 },
  todaySales: { count: 9, usd: 1200, ves: 12000 },
};

function renderGrid(overrides: Partial<React.ComponentProps<typeof OrdersKpiGrid>> = {}) {
  const onSelectTab = vi.fn();
  const onOpenFirstPendingProof = vi.fn();
  render(
    <OrdersKpiGrid
      kpis={KPIS}
      canSeeFinances
      activeTab="all"
      onSelectTab={onSelectTab}
      onOpenFirstPendingProof={onOpenFirstPendingProof}
      hasPendingProof
      {...overrides}
    />,
  );
  return { onSelectTab, onOpenFirstPendingProof };
}

describe('OrdersKpiGrid', () => {
  it('muestra los conteos y montos de las cuatro tarjetas', () => {
    renderGrid();

    expect(screen.getByText('Pendientes de Pago')).toBeInTheDocument();
    expect(screen.getByText('En Cocina')).toBeInTheDocument();
    expect(screen.getByText('Listos / Entregados')).toBeInTheDocument();
    expect(screen.getByText('Ventas de Hoy')).toBeInTheDocument();
    expect(screen.getByText('$450.00')).toBeInTheDocument();
    expect(screen.getByText(/12[.\s]?000,00/)).toBeInTheDocument();
  });

  it('acomoda las cuatro tarjetas en una grilla horizontal responsiva', () => {
    renderGrid();

    const section = screen.getByRole('region', { name: 'Métricas del día' });

    expect(section).toHaveClass('grid', 'grid-cols-2', 'lg:grid-cols-4');
  });

  it('desglosa los pedidos en marcha y en cola', () => {
    renderGrid();

    expect(screen.getByText('2 en marcha · 2 en cola')).toBeInTheDocument();
    expect(screen.getByText('1 listos · 1 en camino')).toBeInTheDocument();
  });

  it('oculta las ventas del día para quien no tiene acceso a finanzas', () => {
    renderGrid({ canSeeFinances: false });

    expect(screen.queryByText('Ventas de Hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('$1,200.00')).not.toBeInTheDocument();
    expect(screen.getByText('Pendientes de Pago')).toBeInTheDocument();
  });

  it('avisa cuando la tasa BCV todavía no está disponible', () => {
    renderGrid({
      kpis: { ...KPIS, todaySales: { count: 9, usd: 1200, ves: 0 } },
    });

    expect(screen.getByText(/Tasa BCV pendiente/i)).toBeInTheDocument();
  });

  it('salta a la pestaña correspondiente al pulsar una tarjeta', async () => {
    const { onSelectTab } = renderGrid();

    await userEvent.click(screen.getByTestId('kpi-kitchen'));

    expect(onSelectTab).toHaveBeenCalledWith('kitchen');
  });

  it('marca la tarjeta de la pestaña activa', () => {
    renderGrid({ activeTab: 'kitchen' });

    expect(screen.getByTestId('kpi-kitchen')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('kpi-dispatch')).toHaveAttribute('aria-pressed', 'false');
  });

  it('abre el comprobante pendiente sin cambiar la pestaña activa', async () => {
    const { onSelectTab, onOpenFirstPendingProof } = renderGrid({ activeTab: 'all' });

    await userEvent.click(screen.getByTestId('kpi-open-pending-proof'));

    expect(onOpenFirstPendingProof).toHaveBeenCalledTimes(1);
    expect(onSelectTab).not.toHaveBeenCalled();
  });

  it('oculta el acceso al comprobante cuando no hay ninguno adjunto', () => {
    renderGrid({ hasPendingProof: false });

    expect(screen.queryByTestId('kpi-open-pending-proof')).not.toBeInTheDocument();
  });
});
