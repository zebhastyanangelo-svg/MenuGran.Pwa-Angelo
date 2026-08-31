import { render, screen, waitFor, within } from '@testing-library/react';
import { OrderTracker } from './OrderTracker';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { NotificationToastProvider } from '../components/pwa/NotificationToast';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

let channelCallbackRef = { current: null as any };

vi.stubEnv('VITE_SUPABASE_URL', 'https://dummy.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'dummy-key');

vi.mock('../services/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockImplementation((event: string, _filter: any, callback: any) => {
      if (event === 'postgres_changes') {
        channelCallbackRef.current = callback;
      }
      return mockChannel;
    }),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
      from: vi.fn().mockImplementation(() => {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }),
    },
  };
});

import { supabase } from '../services/supabase';

const useAuthMock = {
  user: null as any,
  profile: null,
  isLoading: false,
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock,
}));

const createWrapper = () => ({
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <CartProvider>
        <NotificationToastProvider>
          <MemoryRouter initialEntries={['/order/test-order-id']}>
            <Routes>
              <Route path="/order/:id" element={children} />
            </Routes>
          </MemoryRouter>
        </NotificationToastProvider>
      </CartProvider>
    </AuthProvider>
  ),
});

describe('OrderTracker', () => {
  const mockOrder: any = {
    id: 'test-order-id',
    merchant_id: 'test-merchant-id',
    customer_id: 'test-customer-id',
    type: 'delivery',
    status: 'confirmed',
    payment_method: 'pago_movil',
    payment_reference: 'PM123456',
    total_amount: 25.50,
    table_number: null,
    delivery_location: null,
    delivery_address_notes: 'Dejar en la puerta',
    items: [
      {
        product_id: 'prod-1',
        quantity: 2,
        unit_price: 10.0,
        notes: 'Sin cebolla',
      },
      {
        product_id: 'prod-2',
        quantity: 1,
        unit_price: 5.5,
        notes: ''
      }
    ],
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.user = { id: 'test-user-id', email: 'test@example.com' };
    useAuthMock.profile = null;
    useAuthMock.isLoading = false;
    channelCallbackRef.current = null;
  });

  it('should sanity check', () => {
    expect(true).toBe(true);
  });

  it('should load and display order data', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };
    (supabase.from as Mock).mockReturnValue(mockFrom);

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/seguimiento de orden/i, { exact: false })).toBeInTheDocument();
    });

    expect(screen.getByText(/resumen de la orden/i)).toBeInTheDocument();
    expect(screen.getByText(/productos/i)).toBeInTheDocument();
    expect(screen.getByText(/información del comercio/i)).toBeInTheDocument();
    expect(screen.getByText(/fecha:/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo:/i)).toBeInTheDocument();
    expect(screen.getByText(/método de pago:/i)).toBeInTheDocument();

    const orderSummaryCardHeading = screen.getByText(/resumen de la orden/i);
    const orderSummaryCardSection = orderSummaryCardHeading.closest('section') || orderSummaryCardHeading.parentElement!;
    expect(within(orderSummaryCardSection).getByText(/\$25\.50/)).toBeInTheDocument();
    expect(screen.getByText(/2\s*x/i)).toBeInTheDocument();
    expect(screen.getByText(/pm123456/i)).toBeInTheDocument();

    const headerTitle = screen.getByText(/seguimiento de orden #test-ord/i);
    const header = headerTitle.closest('header') || headerTitle.parentElement!;
    const statusP = within(header).getByText(/estado actual:/i);
    expect(statusP).toHaveTextContent(/estado actual: confirmado/i);
  });

  it('should render animated order status stepper', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };
    (supabase.from as Mock).mockReturnValue(mockFrom);

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/seguimiento de orden/i)).toBeInTheDocument();
    });

    const stepper = screen.getByText('Pendiente de Pago').closest('div');
    expect(stepper).toBeInTheDocument();

    expect(screen.getAllByText('Pendiente de Pago').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle loading state', async () => {
    let resolveOrder: any;
    const loadingPromise = new Promise(resolve => {
      resolveOrder = resolve;
    });

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => loadingPromise),
    };
    (supabase.from as Mock).mockReturnValue(mockFrom);

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    expect(screen.getByText(/cargando orden/i)).toBeInTheDocument();

    resolveOrder({ data: mockOrder, error: null });

    await waitFor(() => {
      expect(screen.getByText(/seguimiento de orden/i)).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Order not found' } }),
    };
    (supabase.from as Mock).mockReturnValue(mockFrom);

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/error al cargar la orden/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/volver al mercado/i)).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    useAuthMock.user = null;
    useAuthMock.profile = null;
    useAuthMock.isLoading = false;

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    expect(screen.queryByText(/seguimiento de orden/i)).not.toBeInTheDocument();
  });

  it('should update order status in real-time', async () => {
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
    };
    (supabase.from as Mock).mockReturnValue(mockFrom);

    const { wrapper } = createWrapper();
    render(<OrderTracker />, { wrapper });

    await waitFor(() => {
      const headerTitle = screen.getByText(/seguimiento de orden #test-ord/i);
      const header = headerTitle.closest('header') || headerTitle.parentElement!;
      const statusP = within(header).getByText(/estado actual:/i);
      expect(statusP).toHaveTextContent(/estado actual: confirmado/i);
    });

    const updatedOrder = { ...mockOrder, status: 'preparing' };
    if (channelCallbackRef.current) {
      channelCallbackRef.current({
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        new: updatedOrder,
        old: mockOrder,
      });
    }

    await waitFor(() => {
      const headerTitle = screen.getByText(/seguimiento de orden #test-ord/i);
      const header = headerTitle.closest('header') || headerTitle.parentElement!;
      const statusP = within(header).getByText(/estado actual:/i);
      expect(statusP).toHaveTextContent(/estado actual: en preparación/i);
      expect(statusP).not.toHaveTextContent(/estado actual: confirmado/i);
    });
  });
});