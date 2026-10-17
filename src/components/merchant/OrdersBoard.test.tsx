import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrderStatus, UserRole, MerchantStaffPermissions } from '../../types/database';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import { render } from '../../test/test-utils';
import { OrdersBoard } from './OrdersBoard';

const refreshRate = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useExchangeRate', () => ({
  useExchangeRate: () => ({
    rate: 10,
    isLoading: false,
    error: null,
    refresh: refreshRate,
    lastUpdated: new Date('2026-10-24T15:00:00.000Z'),
    source: 'BCV',
  }),
}));

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: '845f9a12-0000-4000-8000-000000000000',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'payment_pending',
    payment_method: 'pago_movil',
    payment_reference: 'REF-9999',
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

function buildPermissions(
  overrides: Partial<MerchantStaffPermissions> = {},
): MerchantStaffPermissions {
  return {
    can_manage_menu: false,
    can_view_orders: true,
    can_view_assigned_deliveries: false,
    ...overrides,
  };
}

function renderBoard(
  orders: OrderWithCustomer[],
  overrides: Partial<React.ComponentProps<typeof OrdersBoard>> = {},
) {
  const onUpdateStatus = vi.fn<(orderId: string, status: OrderStatus) => void>();
  const onAssignDriver = vi.fn();
  const onOpenProof = vi.fn();
  const onRequestReference = vi.fn();
  const onSync = vi.fn();
  const view = render(
    <OrdersBoard
      orders={orders}
      drivers={[]}
      role={'merchant_owner' as UserRole}
      staffPermissions={null}
      onUpdateStatus={onUpdateStatus}
      onAssignDriver={onAssignDriver}
      onOpenProof={onOpenProof}
      onRequestReference={onRequestReference}
      onSync={onSync}
      {...overrides}
    />,
  );
  return { view, onUpdateStatus, onAssignDriver, onOpenProof, onRequestReference, onSync };
}

describe('OrdersBoard', () => {
  it('muestra el título y el indicador de tiempo real', () => {
    renderBoard([]);

    expect(screen.getByRole('heading', { name: 'Tablero de Pedidos en Vivo' })).toBeInTheDocument();
    expect(screen.getByTestId('live-badge')).toHaveTextContent('En tiempo real');
  });

  it('arranca en la pestaña de pendientes de pago', () => {
    renderBoard([buildOrder({ status: 'confirmed' })]);

    expect(screen.getByTestId('tab-payment_pending')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/No hay pedidos que coincidan/i)).toBeInTheDocument();
  });

  it('muestra las cuatro tarjetas de métricas al propietario', () => {
    renderBoard([]);

    expect(screen.getByTestId('kpi-pending-payment')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-kitchen')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-dispatch')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-today-sales')).toBeInTheDocument();
  });

  it('oculta las ventas del día al personal sin acceso a finanzas', () => {
    renderBoard([], {
      role: 'merchant_staff',
      staffPermissions: buildPermissions({ can_manage_orders: true }),
    });

    expect(screen.queryByTestId('kpi-today-sales')).not.toBeInTheDocument();
    expect(screen.getByTestId('kpi-pending-payment')).toBeInTheDocument();
  });

  it('filtra las tarjetas por estado al pulsar una de las métricas', async () => {
    renderBoard([
      buildOrder({ id: 'a1', status: 'preparing' }),
      buildOrder({ id: 'b2', status: 'confirmed' }),
    ]);

    await userEvent.click(screen.getByTestId('kpi-kitchen'));

    expect(screen.getByTestId('tab-kitchen')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('order-card-a1')).toBeInTheDocument();
    expect(screen.getByTestId('order-card-b2')).toBeInTheDocument();
  });

  it('refleja los contadores de cada pestaña', () => {
    renderBoard([
      buildOrder({ id: 'a1', status: 'preparing' }),
      buildOrder({ id: 'b2', status: 'payment_pending' }),
    ]);

    expect(screen.getByTestId('tab-kitchen')).toHaveTextContent('1');
    expect(screen.getByTestId('tab-payment_pending')).toHaveTextContent('1');
    expect(screen.getByTestId('tab-all')).toHaveTextContent('2');
  });

  it('busca por código corto de orden', async () => {
    renderBoard([
      buildOrder({ id: '845f0000-0000' }),
      buildOrder({ id: 'aaaa0000-0000' }),
    ]);

    await userEvent.type(screen.getByLabelText('Buscar pedido o cliente'), '845F');

    expect(screen.getByTestId('order-card-845f0000-0000')).toBeInTheDocument();
    expect(screen.queryByTestId('order-card-aaaa0000-0000')).not.toBeInTheDocument();
  });

  it('busca por nombre del cliente', async () => {
    renderBoard([
      buildOrder({
        id: '845f0000-0000',
        profiles: { full_name: 'María López', email: 'maria@test.com' },
      }),
      buildOrder({
        id: 'aaaa0000-0000',
        profiles: { full_name: 'Pedro Pérez', email: 'pedro@test.com' },
      }),
    ]);

    await userEvent.type(screen.getByLabelText('Buscar pedido o cliente'), 'María');

    expect(screen.getByTestId('order-card-845f0000-0000')).toBeInTheDocument();
    expect(screen.queryByTestId('order-card-aaaa0000-0000')).not.toBeInTheDocument();
  });

  it('filtra por método de pago', async () => {
    renderBoard([
      buildOrder({ id: 'a1', payment_method: 'cash' }),
      buildOrder({ id: 'b2', payment_method: 'zelle' }),
    ]);

    await userEvent.selectOptions(screen.getByLabelText('Método de pago'), 'cash');

    expect(screen.getByTestId('order-card-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('order-card-b2')).not.toBeInTheDocument();
  });

  it('excluye los pedidos anteriores al período seleccionado', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    renderBoard([
      buildOrder({ id: 'hoy' }),
      buildOrder({ id: 'ayer', created_at: yesterday }),
    ]);

    await userEvent.selectOptions(screen.getByLabelText('Fecha'), 'last_7_days');
    expect(screen.getByTestId('order-card-ayer')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Fecha'), 'today');
    expect(screen.getByTestId('order-card-hoy')).toBeInTheDocument();
    expect(screen.queryByTestId('order-card-ayer')).not.toBeInTheDocument();
  });

  it('muestra la comanda y la conciliación dentro de cada tarjeta', async () => {
    renderBoard([
      buildOrder({
        id: '845f0000-0000',
        status: 'payment_pending',
        payment_proof_url: 'proofs/845f.jpg',
        items: [
          {
            product_id: 'p-1',
            quantity: 2,
            unit_price: 75,
            title: 'Pizza',
            excluded_ingredients: ['Cebolla'],
          },
        ],
      }),
    ]);

    const card = screen.getByTestId('order-card-845f0000-0000');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('2 × Pizza')).toBeInTheDocument();
    expect(screen.getByTestId('customized-order-badge')).toHaveTextContent('Modificado por Cliente');
    expect(screen.getByTestId('payment-reconciliation-panel')).toBeInTheDocument();
  });

  it('propaga el cambio de estado desde la tarjeta', async () => {
    const { onUpdateStatus } = renderBoard([buildOrder({ id: '845f0000-0000', status: 'confirmed' })]);

    await userEvent.click(screen.getByTestId('tab-kitchen'));
    await userEvent.click(screen.getByTestId('transition-845f0000-0000-preparing'));

    expect(onUpdateStatus).toHaveBeenCalledWith('845f0000-0000', 'preparing');
  });

  it('valida el pago desde la tarjeta de un pedido pendiente', async () => {
    const { onUpdateStatus } = renderBoard([buildOrder({ id: '845f0000-0000' })]);

    await userEvent.click(screen.getByTestId('validate-payment-845f0000-0000'));

    expect(onUpdateStatus).toHaveBeenCalledWith('845f0000-0000', 'confirmed');
  });

  it('propaga la solicitud de referencia correcta', async () => {
    const { onRequestReference } = renderBoard([buildOrder({ id: '845f0000-0000' })]);

    await userEvent.click(screen.getByTestId('request-reference-845f0000-0000'));

    expect(onRequestReference).toHaveBeenCalledTimes(1);
  });

  it('abre el comprobante del primer pedido adjunto desde la tarjeta de métrica', async () => {
    const { onOpenProof } = renderBoard([
      buildOrder({ id: 'con-prueba', payment_proof_url: 'proofs/a.jpg' }),
      buildOrder({ id: 'sin-prueba' }),
    ]);

    await userEvent.click(screen.getByTestId('kpi-open-pending-proof'));

    expect(onOpenProof).toHaveBeenCalledTimes(1);
    expect(onOpenProof.mock.calls[0][0].id).toBe('con-prueba');
  });

  it('sincroniza la tasa BCV y los pedidos del tablero', async () => {
    const { onSync } = renderBoard([]);

    await userEvent.click(screen.getByTestId('board-sync'));

    expect(refreshRate).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('omite el botón Sincronizar cuando la vista no lo ofrece', () => {
    renderBoard([], { onSync: undefined });

    expect(screen.queryByTestId('board-sync')).not.toBeInTheDocument();
  });

  it('pagina cuando hay más pedidos que el tamaño de página', async () => {
    const orders = Array.from({ length: 9 }, (_, index) =>
      buildOrder({ id: `order-${index}`, status: 'preparing' }),
    );
    renderBoard(orders);

    await userEvent.click(screen.getByTestId('tab-kitchen'));
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('deja el tablero en solo lectura para un empleado sin can_manage_orders', async () => {
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_staff',
      staffPermissions: buildPermissions(),
    });

    expect(screen.queryByTestId('validate-payment-845f0000-0000')).not.toBeInTheDocument();
    expect(screen.getByText(/Solo lectura/i)).toBeInTheDocument();
  });

  it('permite operar al empleado con can_manage_orders', () => {
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_staff',
      staffPermissions: buildPermissions({ can_manage_orders: true }),
    });

    expect(screen.getByTestId('validate-payment-845f0000-0000')).toBeInTheDocument();
  });

  it('no declara solo lectura mientras los permisos del empleado se resuelven', () => {
    // El caso reportado: el empleado llegaba con el permiso puesto en la base y
    // veía el tablero bloqueado mientras su consulta de permisos no respondía.
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_staff',
      staffPermissions: null,
      permissionsPending: true,
    });

    expect(screen.queryByText(/Solo lectura/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Verificando tus permisos/i)).toBeInTheDocument();
  });

  it('deja operar al empleado aunque su consulta de permisos siga en vuelo', () => {
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_staff',
      staffPermissions: buildPermissions({ can_manage_orders: true }),
      permissionsPending: true,
    });

    expect(screen.getByTestId('validate-payment-845f0000-0000')).toBeInTheDocument();
  });

  it('deja operar al propietario aunque los permisos nunca se carguen', () => {
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_owner',
      staffPermissions: null,
      permissionsPending: true,
    });

    expect(screen.getByTestId('validate-payment-845f0000-0000')).toBeInTheDocument();
    expect(screen.queryByText(/Solo lectura/i)).not.toBeInTheDocument();
  });

  it('opera al empleado cuyo permiso llegó como texto', () => {
    renderBoard([buildOrder({ id: '845f0000-0000' })], {
      role: 'merchant_staff',
      staffPermissions: buildPermissions({
        can_manage_orders: 'true' as unknown as boolean,
      }),
    });

    expect(screen.getByTestId('validate-payment-845f0000-0000')).toBeInTheDocument();
  });
});
