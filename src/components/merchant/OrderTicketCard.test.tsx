import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import type { OrderStatus } from '../../types/database';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import { OrderTicketCard } from './OrderTicketCard';

const NOW = new Date('2026-10-24T15:30:00.000Z');
const FOUR_MINUTES_AGO = new Date(NOW.getTime() - 4 * 60_000).toISOString();

const PAGO_MOVIL: MerchantPagoMovilInfo = {
  bank: 'Banesco',
  idNumber: 'J-123456789',
  phone: '0412-1234567',
};

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: '845f9a12-0000-4000-8000-000000000000',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'confirmed',
    payment_method: 'pago_movil',
    payment_reference: 'REF-9999',
    payment_proof_url: 'proofs/order-1.jpg',
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: 'Av. Libertador, Casa 12',
    latitude: null,
    longitude: null,
    items: [{ product_id: 'p-1', quantity: 2, unit_price: 75, title: 'Pizza Pepperoni' }],
    created_at: FOUR_MINUTES_AGO,
    profiles: {
      full_name: 'María López',
      email: 'maria@test.com',
      ci: 'V12345678',
      phone: '+584141234567',
    },
    ...overrides,
  };
}

function renderCard(
  order: OrderWithCustomer,
  overrides: Partial<React.ComponentProps<typeof OrderTicketCard>> = {},
) {
  const onUpdateStatus = vi.fn<(orderId: string, status: OrderStatus) => void>();
  const onAssignDriver = vi.fn();
  const onOpenProof = vi.fn();
  const onOpenDriverAssignment = vi.fn();
  const onRequestReference = vi.fn();
  const view = render(
    <OrderTicketCard
      order={order}
      drivers={[]}
      pagoMovil={PAGO_MOVIL}
      bcvRate={10}
      now={NOW}
      canOperate
      onUpdateStatus={onUpdateStatus}
      onAssignDriver={onAssignDriver}
      onOpenDriverAssignment={onOpenDriverAssignment}
      onOpenProof={onOpenProof}
      onRequestReference={onRequestReference}
      {...overrides}
    />,
  );
  return {
    view,
    onUpdateStatus,
    onAssignDriver,
    onOpenProof,
    onOpenDriverAssignment,
    onRequestReference,
  };
}

describe('OrderTicketCard', () => {
  it('muestra el encabezado con código corto, tiempo transcurrido y tipo de servicio', () => {
    renderCard(buildOrder());

    expect(screen.getByText('#845F')).toBeInTheDocument();
    expect(screen.getByTestId(`elapsed-${buildOrder().id}`)).toHaveTextContent('Hace 4 min');
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Pago Móvil')).toBeInTheDocument();
  });

  it('muestra el estado de la orden y el estado del pago', () => {
    renderCard(buildOrder({ status: 'preparing' }));

    expect(screen.getAllByText('En Preparación')[0]).toBeInTheDocument();
    expect(screen.getByTestId('payment-state-chip')).toHaveTextContent('Pago conciliado');
  });

  it('marca el pago como sin validar mientras sigue en payment_pending', () => {
    renderCard(buildOrder({ status: 'payment_pending' }));

    expect(screen.getByTestId('payment-state-chip')).toHaveTextContent('Pago sin validar');
  });

  it('muestra los datos de contacto del cliente con acceso rápido al teléfono', () => {
    renderCard(buildOrder());

    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('V12345678')).toBeInTheDocument();
    expect(screen.getByTestId(`customer-phone-${buildOrder().id}`)).toHaveAttribute(
      'href',
      'tel:+584141234567',
    );
  });

  it('cae a un identificador cuando el cliente no tiene nombre', () => {
    renderCard(buildOrder({ profiles: null }));

    expect(screen.getByText(/Cliente c-1/)).toBeInTheDocument();
  });

  it('incluye la conciliación de pago con los datos bancarios del comercio', () => {
    renderCard(buildOrder());

    expect(screen.getByTestId('payment-reconciliation-panel')).toBeInTheDocument();
    expect(screen.getByText('Banesco')).toBeInTheDocument();
    expect(screen.getByText('0412-1234567')).toBeInTheDocument();
    expect(screen.getByText('REF-9999')).toBeInTheDocument();
  });

  it('valida el pago y envía el pedido a cocina con un solo clic', async () => {
    const { onUpdateStatus } = renderCard(buildOrder({ status: 'payment_pending' }));

    await userEvent.click(screen.getByTestId(`validate-payment-${buildOrder().id}`));

    expect(onUpdateStatus).toHaveBeenCalledWith(buildOrder().id, 'confirmed');
  });

  it('permite pedir al cliente una referencia legible', async () => {
    const { onRequestReference } = renderCard(buildOrder({ status: 'payment_pending' }));

    await userEvent.click(screen.getByTestId(`request-reference-${buildOrder().id}`));

    expect(onRequestReference).toHaveBeenCalledTimes(1);
  });

  it('abre el comprobante adjunto para ampliarlo', async () => {
    const { onOpenProof } = renderCard(buildOrder());

    await userEvent.click(screen.getByTestId(`proof-button-${buildOrder().id}`));

    expect(onOpenProof).toHaveBeenCalledTimes(1);
  });

  it('muestra la comanda con cantidades e ingredientes modificados por el cliente', () => {
    renderCard(
      buildOrder({
        items: [
          { product_id: 'p-1', quantity: 2, unit_price: 75, title: 'Pizza Pepperoni' },
          {
            product_id: 'p-2',
            quantity: 1,
            unit_price: 5,
            title: 'Refresco',
            excluded_ingredients: ['Cebolla'],
          },
        ],
      }),
    );

    const ticket = screen.getByTestId('order-items-list');
    expect(within(ticket).getByText('2 × Pizza Pepperoni')).toBeInTheDocument();
    expect(within(ticket).getByText(/^Sin:/)).toHaveTextContent('Sin: Cebolla');
    expect(screen.getByTestId('customized-order-badge')).toHaveTextContent('Modificado por Cliente');
  });

  it('refleja el total en dólares y en bolívares a la tasa BCV', () => {
    renderCard(buildOrder());

    expect(screen.getAllByText('$150.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1[.\s]?500,00/).length).toBeGreaterThan(0);
  });

  it('omite el monto en bolívares cuando no hay tasa disponible', () => {
    renderCard(buildOrder(), { bcvRate: 0 });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('expone las transiciones de estado propias del pedido', async () => {
    const { onUpdateStatus } = renderCard(buildOrder({ status: 'preparing' }));

    await userEvent.click(screen.getByTestId(`transition-${buildOrder().id}-ready`));

    expect(onUpdateStatus).toHaveBeenCalledWith(buildOrder().id, 'ready');
  });

  it('permite rechazar el pedido', async () => {
    const { onUpdateStatus } = renderCard(buildOrder({ status: 'confirmed' }));

    await userEvent.click(screen.getByTestId(`transition-${buildOrder().id}-cancelled`));

    expect(onUpdateStatus).toHaveBeenCalledWith(buildOrder().id, 'cancelled');
  });

  it('no ofrece transiciones para un pedido ya entregado', () => {
    renderCard(buildOrder({ status: 'delivered' }));

    expect(screen.queryByRole('button', { name: 'Marcar como listo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  it('avisa que el retiro en local lo confirma el cliente', () => {
    renderCard(buildOrder({ type: 'pickup', status: 'ready' }));

    expect(screen.getByTestId('pickup-ready-notice')).toBeInTheDocument();
  });

  it('ofrece asignar rider a un pedido delivery con repartidores disponibles', async () => {
    const { onAssignDriver, onOpenDriverAssignment } = renderCard(buildOrder({ status: 'confirmed' }), {
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
    });

    await userEvent.selectOptions(
      screen.getByTestId(`driver-select-${buildOrder().id}`),
      'driver-1',
    );
    expect(onAssignDriver).toHaveBeenCalledWith(buildOrder().id, 'driver-1');

    await userEvent.click(screen.getByTestId(`assign-driver-${buildOrder().id}`));
    expect(onOpenDriverAssignment).toHaveBeenCalledTimes(1);
  });

  it('muestra el repartidor asignado en lugar del selector', () => {
    renderCard(buildOrder({ driver_id: 'driver-1', status: 'ready' }), {
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
    });

    expect(screen.getByTestId(`assigned-driver-${buildOrder().id}`)).toHaveTextContent('Carlos R');
    expect(screen.queryByTestId(`driver-select-${buildOrder().id}`)).not.toBeInTheDocument();
  });

  it('oculta el selector de rider cuando el pedido ya está en camino', () => {
    renderCard(buildOrder({ status: 'on_the_way' }), {
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
    });

    expect(screen.queryByTestId(`driver-select-${buildOrder().id}`)).not.toBeInTheDocument();
  });

  it('omite la asignación de repartidor para retiro en local', () => {
    renderCard(buildOrder({ type: 'pickup', status: 'confirmed' }), {
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
    });

    expect(screen.queryByTestId(`driver-select-${buildOrder().id}`)).not.toBeInTheDocument();
  });

  it('muestra la dirección de entrega solo en pedidos delivery', () => {
    const delivery = renderCard(buildOrder());
    expect(screen.getByText('Av. Libertador, Casa 12')).toBeInTheDocument();
    delivery.view.unmount();

    renderCard(buildOrder({ type: 'pickup', delivery_address: 'Av. Libertador, Casa 12' }));
    expect(screen.queryByText('Av. Libertador, Casa 12')).not.toBeInTheDocument();
  });

  it('oculta todas las acciones de escritura para un tablero en solo lectura', () => {
    renderCard(buildOrder({ status: 'confirmed' }), { canOperate: false });

    expect(screen.queryByRole('button', { name: 'Marcar como preparando' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.queryByTestId(`validate-payment-${buildOrder().id}`)).not.toBeInTheDocument();
    expect(screen.getByText(/Solo lectura/i)).toBeInTheDocument();
  });
});
