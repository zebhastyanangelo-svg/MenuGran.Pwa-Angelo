import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { OrderStatus } from '../types/database';
import type { OrderWithCustomer } from '../hooks/useMerchantDashboardPage';
import { render } from '../test/test-utils';
import { MerchantDashboard } from './MerchantDashboard';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../hooks/useStaffPermissions', () => ({ useStaffPermissions: vi.fn() }));

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

  beforeEach(async () => {
    useAuthMock = (await import('../hooks/useAuth')).useAuth as ReturnType<typeof vi.fn>;
    useStaffPermissionsMock = (await import('../hooks/useStaffPermissions'))
      .useStaffPermissions as ReturnType<typeof vi.fn>;
    useMerchantDashboardMock = (await import('../hooks/useMerchantDashboard'))
      .useMerchantDashboard as ReturnType<typeof vi.fn>;

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'merchant_staff' },
      isLoading: false,
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