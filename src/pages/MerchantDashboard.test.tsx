import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrderStatus } from '../types/database';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';
import { render } from '../test/test-utils';
import { MerchantDashboard } from './MerchantDashboard';

const toastMocks = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../hooks/useStaffPermissions', () => ({ useStaffPermissions: vi.fn() }));

vi.mock('../components/pwa/useNotificationToast', () => ({
  useNotificationToast: () => toastMocks,
}));

vi.mock('../hooks/useMerchantPagoMovil', () => ({ useMerchantPagoMovil: vi.fn() }));

vi.mock('../hooks/useMerchantDashboard', () => ({
  PAYMENT_PROOF_BUCKET: 'payment-proofs',
  useMerchantDashboard: vi.fn(),
}));

vi.mock('../hooks/useExchangeRate', () => ({
  useExchangeRate: () => ({
    rate: 10,
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    lastUpdated: new Date('2026-10-24T15:00:00.000Z'),
    source: 'BCV',
  }),
}));

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: 'a1000000-0000-4000-8000-000000000001',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'payment_pending',
    payment_method: 'pago_movil',
    payment_reference: 'REF-1',
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

const ORDER_ID = 'a1000000-0000-4000-8000-000000000001';

describe('MerchantDashboard (permisos del tablero)', () => {
  let useAuthMock: ReturnType<typeof vi.fn>;
  let useStaffPermissionsMock: ReturnType<typeof vi.fn>;
  let useMerchantDashboardMock: ReturnType<typeof vi.fn>;
  let useMerchantPagoMovilMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    useAuthMock = (await import('../hooks/useAuth')).useAuth as ReturnType<typeof vi.fn>;
    useStaffPermissionsMock = (await import('../hooks/useStaffPermissions'))
      .useStaffPermissions as ReturnType<typeof vi.fn>;
    useMerchantDashboardMock = (await import('../hooks/useMerchantDashboard'))
      .useMerchantDashboard as ReturnType<typeof vi.fn>;
    useMerchantPagoMovilMock = (await import('../hooks/useMerchantPagoMovil'))
      .useMerchantPagoMovil as ReturnType<typeof vi.fn>;

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'merchant_staff' },
      isLoading: false,
    });

    // El comercio sí configuró su Pago Móvil: es lo que la caja contrasta contra
    // el comprobante del cliente.
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: { bank: 'Banco de Venezuela', idNumber: '32663111', phone: '1274555' },
      isLoading: false,
      error: null,
    });

    useMerchantDashboardMock.mockReturnValue({
      merchantIds: ['m-1'],
      orders: [buildOrder()],
      drivers: [],
      loading: false,
      error: null,
      updateOrderStatus: vi.fn<(id: string, status: OrderStatus) => void>(),
      assignDriver: vi.fn(),
    });
  });

  it('permite operar al empleado con can_manage_orders en su ficha', () => {
    // Regresión: la página pasaba `staffPermissions={null}` fijo, así que el
    // tablero caía en "solo lectura" aunque el permiso estuviera en la base.
    useStaffPermissionsMock.mockReturnValue({
      permissions: {
        can_manage_menu: false,
        can_view_orders: true,
        can_manage_orders: true,
        can_view_assigned_deliveries: false,
      },
      isLoading: false,
      hasError: false,
    });

    render(<MerchantDashboard />);

    expect(screen.getByTestId(`validate-payment-${ORDER_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId('read-only-notice')).not.toBeInTheDocument();
  });

  it('deja el tablero en solo lectura si el empleado no tiene el permiso', () => {
    useStaffPermissionsMock.mockReturnValue({
      permissions: {
        can_manage_menu: false,
        can_view_orders: true,
        can_manage_orders: false,
        can_view_assigned_deliveries: false,
      },
      isLoading: false,
      hasError: false,
    });

    render(<MerchantDashboard />);

    expect(screen.queryByTestId(`validate-payment-${ORDER_ID}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('read-only-notice')).toHaveTextContent(/Solo lectura/i);
  });

  it('no declara solo lectura mientras la ficha del empleado se resuelve', () => {
    useStaffPermissionsMock.mockReturnValue({
      permissions: null,
      isLoading: true,
      hasError: false,
    });

    render(<MerchantDashboard />);

    expect(screen.getByTestId('read-only-notice')).toHaveTextContent(
      /Verificando tus permisos/i,
    );
    expect(screen.queryByText(/Solo lectura/i)).not.toBeInTheDocument();
  });

  it('trata el error de la ficha como pendiente y no como permiso ausente', () => {
    useStaffPermissionsMock.mockReturnValue({
      permissions: null,
      isLoading: false,
      hasError: true,
    });

    render(<MerchantDashboard />);

    expect(screen.getByText(/Verificando tus permisos/i)).toBeInTheDocument();
  });

  it('deja operar al propietario aunque su ficha nunca se cargue', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'merchant_owner' },
      isLoading: false,
    });
    useStaffPermissionsMock.mockReturnValue({
      permissions: null,
      isLoading: true,
      hasError: false,
    });

    render(<MerchantDashboard />);

    expect(screen.getByTestId(`validate-payment-${ORDER_ID}`)).toBeInTheDocument();
  });
});

describe('MerchantDashboard (datos de pago del comercio)', () => {
  let useMerchantPagoMovilMock: ReturnType<typeof vi.fn>;
  let useMerchantDashboardMock: ReturnType<typeof vi.fn>;
  let useStaffPermissionsMock: ReturnType<typeof vi.fn>;
  let useAuthMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    useMerchantPagoMovilMock = (await import('../hooks/useMerchantPagoMovil'))
      .useMerchantPagoMovil as ReturnType<typeof vi.fn>;
    useMerchantDashboardMock = (await import('../hooks/useMerchantDashboard'))
      .useMerchantDashboard as ReturnType<typeof vi.fn>;
    useStaffPermissionsMock = (await import('../hooks/useStaffPermissions'))
      .useStaffPermissions as ReturnType<typeof vi.fn>;
    useAuthMock = (await import('../hooks/useAuth')).useAuth as ReturnType<typeof vi.fn>;

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'merchant_owner' },
      isLoading: false,
    });
    useStaffPermissionsMock.mockReturnValue({
      permissions: null,
      isLoading: false,
      hasError: false,
    });
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: null,
      isLoading: false,
      error: null,
    });
    useMerchantDashboardMock.mockReturnValue({
      merchantIds: ['m-1'],
      orders: [buildOrder({ payment_proof_url: 'proofs/order-1.jpg' })],
      drivers: [],
      loading: false,
      error: null,
      updateOrderStatus: vi.fn<(id: string, status: OrderStatus) => void>(),
      assignDriver: vi.fn(),
    });
  });

  it('resuelve la cuenta receptora del comercio en cada tarjeta de pedido', () => {
    // Regresión: la página no leía `useMerchantPagoMovil`, así que la
    // conciliación pintaba "No configurado" aun con los datos ya guardados.
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: { bank: 'Banco de Venezuela', idNumber: '32663111', phone: '1274555' },
      isLoading: false,
      error: null,
    });

    render(<MerchantDashboard />);

    expect(useMerchantPagoMovilMock).toHaveBeenCalledWith('m-1');
    expect(screen.getByText('Banco receptor')).toBeInTheDocument();
    expect(screen.getByText('Banco de Venezuela')).toBeInTheDocument();
    expect(screen.getByText('1274555')).toBeInTheDocument();
    expect(screen.getByText('32663111')).toBeInTheDocument();
    expect(screen.queryByText('No configurado')).not.toBeInTheDocument();
  });

  it('avisa que falta la referencia bancaria y ofrece pedirla por WhatsApp', async () => {
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: { bank: 'Banco de Venezuela', idNumber: '32663111', phone: '1274555' },
      isLoading: false,
      error: null,
    });
    useMerchantDashboardMock.mockReturnValue({
      merchantIds: ['m-1'],
      orders: [
        buildOrder({
          payment_proof_url: 'proofs/order-1.jpg',
          profiles: {
            full_name: 'Cliente Prueba',
            email: 'cliente@test.com',
            phone: '04141234567',
          },
        }),
      ],
      drivers: [],
      loading: false,
      error: null,
      updateOrderStatus: vi.fn<(id: string, status: OrderStatus) => void>(),
      assignDriver: vi.fn(),
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<MerchantDashboard />);

    await userEvent.click(screen.getByTestId(`request-reference-${ORDER_ID}`));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]?.[0]).toContain('wa.me/04141234567');
    expect(openSpy.mock.calls[0]?.[0]).toContain('referencia%20bancaria');
    openSpy.mockRestore();
  });

  it('avisa cuando el comercio todavía no configuró su Pago Móvil', () => {
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: null,
      isLoading: false,
      error: null,
    });

    render(<MerchantDashboard />);

    expect(screen.getAllByText('No configurado').length).toBeGreaterThan(0);
  });
});

describe('MerchantDashboard (selector de repartidores)', () => {
  let useMerchantDashboardMock: ReturnType<typeof vi.fn>;
  let useAuthMock: ReturnType<typeof vi.fn>;
  let useStaffPermissionsMock: ReturnType<typeof vi.fn>;
  let useMerchantPagoMovilMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    useMerchantDashboardMock = (await import('../hooks/useMerchantDashboard'))
      .useMerchantDashboard as ReturnType<typeof vi.fn>;
    useAuthMock = (await import('../hooks/useAuth')).useAuth as ReturnType<typeof vi.fn>;
    useStaffPermissionsMock = (await import('../hooks/useStaffPermissions'))
      .useStaffPermissions as ReturnType<typeof vi.fn>;
    useMerchantPagoMovilMock = (await import('../hooks/useMerchantPagoMovil'))
      .useMerchantPagoMovil as ReturnType<typeof vi.fn>;

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'merchant_owner' },
      isLoading: false,
    });
    useStaffPermissionsMock.mockReturnValue({
      permissions: null,
      isLoading: false,
      hasError: false,
    });
    useMerchantPagoMovilMock.mockReturnValue({
      pagoMovil: null,
      isLoading: false,
      error: null,
    });
  });

  it('ofrece los repartidores por su nombre real, no por su UUID', () => {
    useMerchantDashboardMock.mockReturnValue({
      merchantIds: ['m-1'],
      orders: [buildOrder()],
      drivers: [{ id: 'driver-1', full_name: 'Jesús Pérez', email: 'jesus@t.com' }],
      loading: false,
      error: null,
      updateOrderStatus: vi.fn<(id: string, status: OrderStatus) => void>(),
      assignDriver: vi.fn(),
    });

    render(<MerchantDashboard />);

    expect(screen.getByRole('option', { name: 'Jesús Pérez' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /driver-1/ })).not.toBeInTheDocument();
  });

  it('asigna el repartidor elegido por su identificador', async () => {
    const assignDriver = vi.fn();
    useMerchantDashboardMock.mockReturnValue({
      merchantIds: ['m-1'],
      orders: [buildOrder()],
      drivers: [{ id: 'driver-1', full_name: 'Jesús Pérez', email: null }],
      loading: false,
      error: null,
      updateOrderStatus: vi.fn<(id: string, status: OrderStatus) => void>(),
      assignDriver,
    });

    render(<MerchantDashboard />);

    await userEvent.selectOptions(
      screen.getByTestId(`driver-select-${ORDER_ID}`),
      'driver-1',
    );

    expect(assignDriver).toHaveBeenCalledWith(ORDER_ID, 'driver-1');
  });
});