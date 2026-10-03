import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersBoard } from './OrdersBoard';
import type { DriverProfile, OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { render } from '../../test/test-utils';

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'on_the_way',
    payment_method: 'pago_movil',
    payment_reference: null,
    payment_proof_url: null,
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: new Date().toISOString(),
    profiles: { full_name: 'Cliente Prueba', email: 'cliente@test.com' },
    ...overrides,
  };
}

function renderBoard(
  orders: OrderWithCustomer[],
  drivers: DriverProfile[] = [],
) {
  const onUpdateStatus = vi.fn();
  const onAssignDriver = vi.fn();
  const onOpenProof = vi.fn();
  render(
    <OrdersBoard
      orders={orders}
      drivers={drivers}
      onUpdateStatus={onUpdateStatus}
      onAssignDriver={onAssignDriver}
      onOpenProof={onOpenProof}
    />,
  );
  return { onUpdateStatus, onAssignDriver, onOpenProof };
}

describe('OrdersBoard', () => {
  it('muestra el badge "Entregado" con estilo verde claro para pedidos delivered', () => {
    renderBoard([buildOrder({ status: 'delivered' })]);

    const badge = screen.getAllByText('Entregado', { selector: 'span' })[0];
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-emerald-100');
    expect(badge.className).toContain('text-emerald-800');
  });

  it('no muestra botones de acción de estado para pedidos delivered', () => {
    renderBoard([buildOrder({ status: 'delivered' })]);

    expect(
      screen.queryByRole('button', { name: 'Marcar como entregado' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('driver-select-order-1')).not.toBeInTheDocument();
  });

  it('muestra el badge "En Camino" mientras el pedido está en tránsito', () => {
    renderBoard([buildOrder({ status: 'on_the_way' })]);

    const badge = screen.getAllByText('En Camino', { selector: 'span' })[0];
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-purple-100');
  });

  it('muestra botones de acción para pedidos que aún pueden transicionar', async () => {
    const { onUpdateStatus } = renderBoard([buildOrder({ status: 'preparing' })]);

    const actionButton = screen.getAllByRole('button', { name: 'Marcar como listo' })[0];
    await userEvent.click(actionButton);

    expect(onUpdateStatus).toHaveBeenCalledWith('order-1', 'ready');
  });

  it('mantiene el botón de comprobante habilitado en pedidos delivered', async () => {
    const { onOpenProof } = renderBoard([
      buildOrder({ status: 'delivered', payment_proof_url: 'proofs/order-1.jpg' }),
    ]);

    const proofButton = screen.getByRole('button', { name: /Ver comprobante/i });
    expect(proofButton).toBeEnabled();
    await userEvent.click(proofButton);
    expect(onOpenProof).toHaveBeenCalledTimes(1);
  });

  it('oculta el select de repartidor para pedidos delivered y on_the_way', () => {
    renderBoard([
      buildOrder({ id: 'order-delivered', status: 'delivered' }),
      buildOrder({ id: 'order-transito', status: 'on_the_way' }),
    ]);

    expect(screen.queryByTestId('driver-select-order-delivered')).not.toBeInTheDocument();
    expect(screen.queryByTestId('driver-select-order-transito')).not.toBeInTheDocument();
  });

  it('muestra "Punto de Venta" sin botón de comprobante para card_pos', () => {
    renderBoard([
      buildOrder({ payment_method: 'card_pos', payment_proof_url: null }),
    ]);

    expect(screen.getAllByText('Punto de Venta')[0]).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ver comprobante/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin capture/i)).not.toBeInTheDocument();
  });

  it('muestra "Efectivo" sin botón de comprobante para cash', () => {
    renderBoard([buildOrder({ payment_method: 'cash', payment_proof_url: null })]);

    expect(screen.getAllByText('Efectivo')[0]).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ver comprobante/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra "Pago Móvil" con botón cuando hay comprobante', async () => {
    const { onOpenProof } = renderBoard([
      buildOrder({
        payment_method: 'pago_movil',
        payment_proof_url: 'proofs/order-1.jpg',
      }),
    ]);

    expect(screen.getAllByText('Pago Móvil')[0]).toBeInTheDocument();
    const proofButton = screen.getByRole('button', { name: /Ver comprobante/i });
    await userEvent.click(proofButton);
    expect(onOpenProof).toHaveBeenCalledTimes(1);
  });

  it('permite marcar como entregado un pickup listo (sin "Enviar para entrega")', async () => {
    const { onUpdateStatus } = renderBoard([
      buildOrder({ type: 'pickup', status: 'ready' }),
    ]);

    expect(
      screen.queryByRole('button', { name: 'Enviar para entrega' }),
    ).not.toBeInTheDocument();

    const deliveredButton = screen.getAllByRole('button', { name: 'Marcar como entregado' })[0];
    await userEvent.click(deliveredButton);

    expect(onUpdateStatus).toHaveBeenCalledWith('order-1', 'delivered');
  });

  it('mantiene "Enviar para entrega" y oculta "Marcar como entregado" en delivery listo', () => {
    renderBoard([buildOrder({ type: 'delivery', status: 'ready' })]);

    expect(
      screen.getAllByRole('button', { name: 'Enviar para entrega' }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole('button', { name: 'Marcar como entregado' }),
    ).not.toBeInTheDocument();
  });

  it('muestra email, cédula y teléfono del cliente en el detalle del pedido', async () => {
    renderBoard([
      buildOrder({
        status: 'confirmed',
        profiles: {
          full_name: 'Cliente Prueba',
          email: 'cliente@test.com',
          ci: 'V12345678',
          phone: '+584121234567',
        },
      }),
    ]);

    const detailButton = screen.getAllByRole('button', { name: /Ver detalles/i })[0];
    await userEvent.click(detailButton);

    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument();
    expect(screen.getByText('cliente@test.com')).toBeInTheDocument();
    expect(screen.getByText('V12345678')).toBeInTheDocument();
    expect(screen.getByText('+584121234567')).toBeInTheDocument();
  });
});
