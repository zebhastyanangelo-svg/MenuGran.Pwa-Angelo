import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useMerchantDashboardPage', () => ({
  useMerchantDashboardPage: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';
import { useMerchantDashboardPage } from '../../hooks/useMerchantDashboardPage';
import { MerchantDashboardPage } from './MerchantDashboardPage';

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

  it('muestra tarjeta de verificación cuando el comercio no tiene tienda asignada', () => {
    (useMerchantDashboardPage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        merchantId: 'm-1',
        merchantName: null,
        isOpen: true,
        activeProducts: 0,
        orders: [],
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
});
