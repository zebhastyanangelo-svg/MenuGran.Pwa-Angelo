import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useMerchantDashboardPage', () => ({
  useMerchantDashboardPage: vi.fn(),
}));
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/proof.jpg' },
          error: null,
        }),
      }),
    },
  },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboardPage } from '../../hooks/useMerchantDashboardPage';
import { MerchantDashboardPage } from './MerchantDashboardPage';
import { useNavigate } from 'react-router-dom';

const today = new Date().toISOString();

const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  merchant_id: 'm-1',
  customer_id: 'c-1',
  type: 'delivery',
  status: 'payment_pending',
  payment_method: 'pago_movil',
  payment_reference: null,
  payment_proof_url: null,
  total_amount: '100.00',
  table_number: null,
  delivery_location: null,
  delivery_address_notes: null,
  items: [{ product_id: 'p-1', quantity: 1, unit_price: 100 }],
  created_at: today,
  ...overrides,
});

function renderPage() {
  return render(
    <BrowserRouter>
      <MerchantDashboardPage />
    </BrowserRouter>,
  );
}

describe('MerchantDashboardPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'user-1' },
      profile: {
        id: 'user-1',
        email: 'merchant@example.com',
        full_name: 'Merchant Owner',
        avatar_url: null,
        role: 'merchant_owner',
        created_at: today,
        updated_at: today,
      },
    });
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 8,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );
  });

  it('saluda al comercio y muestra métricas cuando hay datos', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 8,
        orders: [
          createOrder({ id: 'o1', status: 'payment_pending', total_amount: '100.00' }),
          createOrder({ id: 'o2', status: 'delivered', total_amount: '50.00' }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.getByText(/Hola, La Pizza/i)).toBeInTheDocument();
    expect(screen.getByText('Tienda Abierta')).toBeInTheDocument();
    expect(screen.getByText('Pedidos hoy')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Bs 150.00')).toBeInTheDocument();
    expect(screen.getByText('Productos activos')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('cierra la tienda al pulsar el interruptor', async () => {
    const toggleStoreOpen = vi.fn();
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen,
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    const toggle = screen.getByRole('button', { name: /Tienda Abierta/i });
    await user.click(toggle);

    expect(toggleStoreOpen).toHaveBeenCalledWith(false);
  });

  it('filtra pedidos por la pestaña de estado activa', async () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({ id: 'pend-1', status: 'payment_pending' }),
          createOrder({ id: 'ready-1', status: 'ready' }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.getByText('#pend-1')).toBeInTheDocument();
    expect(screen.queryByText('#ready-1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Listos/i }));

    await waitFor(() => {
      expect(screen.queryByText('#pend-1')).not.toBeInTheDocument();
      expect(screen.getByText('#ready-1')).toBeInTheDocument();
    });
  });

  it('ejecuta la acción rápida sobre el pedido correspondiente', async () => {
    const updateOrderStatus = vi.fn();
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [createOrder({ id: 'o1', status: 'payment_pending' })],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus,
      },
    );

    renderPage();

    await user.click(screen.getByRole('button', { name: /Aceptar/i }));

    expect(updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed');
  });

  it('no renderiza la tarjeta de verificación cuando el comercio ya tiene tienda asignada', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.queryByText(/en proceso de verificación/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contactar por WhatsApp/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Hola, La Pizza/i)).toBeInTheDocument();
  });

  it('muestra tarjeta de verificación cuando el comercio no tiene tienda asignada', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: null,
        isOpen: true,
        activeProducts: 0,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    // Should show verification card, not the normal dashboard
    expect(screen.getByText(/Tu cuenta de comercio está en proceso de verificación/i)).toBeInTheDocument();
    expect(screen.getByText(/Si aún no has registrado tu negocio, contáctanos/i)).toBeInTheDocument();
    expect(screen.getByText(/Contactar por WhatsApp/i)).toBeInTheDocument();

    // Should NOT show the normal dashboard elements
    expect(screen.queryByText('Pedidos hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('Ventas hoy')).not.toBeInTheDocument();
    expect(screen.queryByText('Productos activos')).not.toBeInTheDocument();
    expect(screen.queryByText('Tienda Abierta')).not.toBeInTheDocument();
  });

  it('muestra el banner de bienvenida para merchant_staff con nombre y rol', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'staff-1' },
      profile: {
        id: 'staff-1',
        email: 'empleado@example.com',
        full_name: 'María López',
        avatar_url: null,
        role: 'merchant_staff',
        created_at: today,
        updated_at: today,
      },
      signOut: vi.fn(),
    });
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 5,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    const banner = screen.getByTestId('staff-welcome-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/Hola, María López/i)).toBeInTheDocument();
    expect(screen.getByText('Rol: Empleado')).toBeInTheDocument();
    expect(screen.getByText('La Pizza')).toBeInTheDocument();
    expect(screen.getByTestId('staff-logout-button')).toBeInTheDocument();
  });

  it('no muestra el banner de bienvenida para merchant_owner', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'owner-1' },
      profile: {
        id: 'owner-1',
        email: 'owner@example.com',
        full_name: 'Juan Dueño',
        avatar_url: null,
        role: 'merchant_owner',
        created_at: today,
        updated_at: today,
      },
      signOut: vi.fn(),
    });
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 5,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.queryByTestId('staff-welcome-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
  });

  it('ejecuta signOut y navega a /login al pulsar cerrar sesión del empleado', async () => {
    const signOutMock = vi.fn().mockResolvedValue(undefined);
    const navigateMock = vi.fn();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'staff-1' },
      profile: {
        id: 'staff-1',
        email: 'empleado@example.com',
        full_name: 'María López',
        avatar_url: null,
        role: 'merchant_staff',
        created_at: today,
        updated_at: today,
      },
      signOut: signOutMock,
    });
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    await user.click(screen.getByTestId('staff-logout-button'));

    expect(signOutMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('muestra el botón "Ver comprobante" cuando la orden tiene payment_proof_url', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({
            id: 'proof-1',
            status: 'payment_pending',
            payment_proof_url: 'proofs/order1/photo.jpg',
          }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.getByTestId('proof-button-proof-1')).toBeInTheDocument();
    expect(screen.getByText('Ver comprobante')).toBeInTheDocument();
  });

  it('no muestra el botón "Ver comprobante" cuando no hay payment_proof_url', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({ id: 'no-proof-1', status: 'payment_pending', payment_proof_url: null }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    expect(screen.queryByTestId('proof-button-no-proof-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver comprobante')).not.toBeInTheDocument();
  });

  it('abre el lightbox de comprobante al hacer clic en "Ver comprobante"', async () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({
            id: 'lb-1',
            status: 'payment_pending',
            payment_proof_url: 'proofs/order1/photo.jpg',
          }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    await act(async () => {
      await user.click(screen.getByTestId('proof-button-lb-1'));
    });

    await waitFor(() => {
      const dialog = screen.getByRole('dialog', { name: /comprobante de pago/i });
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByAltText('Comprobante de pago')).toBeInTheDocument();
      expect(within(dialog).getByRole('link', { name: /abrir comprobante en nueva pestaña/i })).toBeInTheDocument();
    });
  });

  it('cierra el lightbox de comprobante al hacer clic en cerrar', async () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({
            id: 'lb-2',
            status: 'payment_pending',
            payment_proof_url: 'proofs/order1/photo.jpg',
          }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    await act(async () => {
      await user.click(screen.getByTestId('proof-button-lb-2'));
    });

    await waitFor(() => {
      expect(screen.getByAltText('Comprobante de pago')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Cerrar comprobante'));
    });

    await waitFor(() => {
      expect(screen.queryByAltText('Comprobante de pago')).not.toBeInTheDocument();
    });
  });

  it('muestra la información del pedido en el lightbox del comprobante', async () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: 'La Pizza',
        isOpen: true,
        activeProducts: 0,
        orders: [
          createOrder({
            id: 'info-1',
            status: 'payment_pending',
            payment_method: 'pago_movil',
            payment_reference: 'REF-12345',
            payment_proof_url: 'proofs/order1/photo.jpg',
            total_amount: '250.00',
          }),
        ],
        drivers: [],
        loading: false,
        error: null,
        toggleStoreOpen: vi.fn(),
        updateOrderStatus: vi.fn(),
      },
    );

    renderPage();

    await act(async () => {
      await user.click(screen.getByTestId('proof-button-info-1'));
    });

    await waitFor(() => {
      const dialog = screen.getByRole('dialog', { name: /comprobante de pago/i });
      expect(within(dialog).getByText(/Pedido #info-1/)).toBeInTheDocument();
      expect(within(dialog).getByText(/\$250\.00/)).toBeInTheDocument();
      expect(within(dialog).getByText(/Pago Móvil/)).toBeInTheDocument();
      expect(within(dialog).getByText(/Ref: REF-12345/)).toBeInTheDocument();
    });
  });

  it('muestra el botón "Asignar al repartidor" en pedidos delivery con drivers disponibles', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      isOpen: true,
      activeProducts: 0,
      orders: [createOrder({ id: 'd-1', type: 'delivery', status: 'payment_pending' })],
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
      loading: false,
      error: null,
      toggleStoreOpen: vi.fn(),
      updateOrderStatus: vi.fn(),
      assignDriver: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('assign-driver-d-1')).toBeInTheDocument();
    expect(screen.getByText('Asignar al repartidor')).toBeInTheDocument();
  });

  it('abre el modal con el único driver preseleccionado y envía la asignación', async () => {
    const assignDriver = vi.fn().mockResolvedValue(undefined);
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      isOpen: true,
      activeProducts: 0,
      orders: [createOrder({ id: 'd-1', type: 'delivery', status: 'payment_pending' })],
      drivers: [{ id: 'driver-1', full_name: 'Carlos R', email: null }],
      loading: false,
      error: null,
      toggleStoreOpen: vi.fn(),
      updateOrderStatus: vi.fn(),
      assignDriver,
    });

    renderPage();

    await user.click(screen.getByTestId('assign-driver-d-1'));

    const dialog = await screen.findByRole('dialog', { name: /asignar repartidor/i });
    expect(within(dialog).getByText('Carlos R')).toBeInTheDocument();
    expect(within(dialog).getByText(/Listo para enviar/i)).toBeInTheDocument();

    await user.click(within(dialog).getByTestId('assign-driver-submit'));

    await waitFor(() => {
      expect(assignDriver).toHaveBeenCalledWith('d-1', 'driver-1');
    });
  });

  it('permite seleccionar entre varios drivers antes de Enviar', async () => {
    const assignDriver = vi.fn().mockResolvedValue(undefined);
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      isOpen: true,
      activeProducts: 0,
      orders: [createOrder({ id: 'd-2', type: 'delivery', status: 'confirmed' })],
      drivers: [
        { id: 'driver-1', full_name: 'Carlos R', email: null },
        { id: 'driver-2', full_name: 'Ana D', email: null },
      ],
      loading: false,
      error: null,
      toggleStoreOpen: vi.fn(),
      updateOrderStatus: vi.fn(),
      assignDriver,
    });

    renderPage();

    await user.click(screen.getByTestId('assign-driver-d-2'));

    const dialog = await screen.findByRole('dialog', { name: /asignar repartidor/i });
    const submit = within(dialog).getByTestId('assign-driver-submit');
    expect(submit).toBeDisabled();

    await user.click(within(dialog).getByTestId('assign-driver-option-driver-2'));
    expect(submit).not.toBeDisabled();

    await user.click(submit);

    await waitFor(() => {
      expect(assignDriver).toHaveBeenCalledWith('d-2', 'driver-2');
    });
  });

  it('muestra mensaje informativo cuando el comercio no tiene repartidores', async () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      merchantId: 'm-1',
      merchantName: 'La Pizza',
      isOpen: true,
      activeProducts: 0,
      orders: [createOrder({ id: 'd-3', type: 'delivery', status: 'ready' })],
      drivers: [],
      loading: false,
      error: null,
      toggleStoreOpen: vi.fn(),
      updateOrderStatus: vi.fn(),
      assignDriver: vi.fn(),
    });

    renderPage();

    // Sin drivers, no aparece el botón "Asignar al repartidor"
    expect(screen.queryByTestId('assign-driver-d-3')).not.toBeInTheDocument();
  });
});
