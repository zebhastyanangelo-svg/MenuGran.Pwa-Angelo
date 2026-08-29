import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './context/AuthContext';
import { AuthForm } from './components/auth/AuthForm';
import { MerchantDashboardPage } from './pages/merchant/MerchantDashboardPage';
import { NotificationToastProvider } from './components/pwa/NotificationToast';
import { useMerchantDashboardPage } from './hooks/useMerchantDashboardPage';

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi
    .fn()
    .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}));

vi.mock('./services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
      signInWithOAuth: authMocks.signInWithOAuth,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      resend: authMocks.resend,
      signOut: authMocks.signOut,
    },
    from: authMocks.from,
  },
  TABLE_NAMES: { profiles: 'profiles' },
}));

vi.mock('./services/merchantService', () => ({
  createMerchant: vi.fn(),
  updateMerchant: vi.fn(),
}));

vi.mock('./hooks/useMerchantDashboardPage', () => ({
  useMerchantDashboardPage: vi.fn(),
}));

const SUPPORT_BANNER_TEXT = /¿Quieres vender tu comida en MenuGran/i;

function resetSupabaseSessionMocks() {
  authMocks.getSession.mockResolvedValue({ data: { session: null } });
  authMocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
}

function mockDashboardData(overrides: Record<string, unknown> = {}) {
  const base = {
    merchantId: null,
    merchantName: null,
    isOpen: false,
    activeProducts: 0,
    orders: [],
    loading: false,
    error: null,
    toggleStoreOpen: vi.fn(),
    updateOrderStatus: vi.fn(),
  };
  const useMerchantMock = useMerchantDashboardPage as unknown as ReturnType<
    typeof vi.fn
  >;
  useMerchantMock.mockReturnValue({ ...base, ...overrides });
}

async function renderWithAuth(ui: ReactNode) {
  await act(async () => {
    render(<MemoryRouter>{ui}</MemoryRouter>);
  });
}

describe('Single Registration Flow (AuthForm)', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseSessionMocks();
  });

  it('renders the simplified register form with client fields and the support banner', async () => {
    await renderWithAuth(
      <AuthProvider>
        <AuthForm defaultTab="register" />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.I./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();

    expect(screen.getByText(SUPPORT_BANNER_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeInTheDocument();

    expect(screen.getByTestId('register-submit')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tipo de cuenta/i)).not.toBeInTheDocument();
  });

  it('registers a customer with role "customer" and shows the email confirmation banner', async () => {
    const user = userEvent.setup();
    authMocks.signUp.mockResolvedValueOnce({
      data: { user: { id: 'new-user-1', email_confirmed_at: null } },
      error: null,
    });

    await renderWithAuth(
      <AuthProvider>
        <AuthForm defaultTab="register" />
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Usuario Test');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.type(screen.getByLabelText(/C.I./i), 'V-12345678');
    await user.type(screen.getByLabelText(/Teléfono/i), '+58 412-123-4567');
    await user.click(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { full_name: 'Usuario Test', role: 'customer' } },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/¡Registro exitoso!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });
});

describe('Merchant Dashboard Verification Card', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseSessionMocks();
  });

  it('renders the verification card with a WhatsApp button when the merchant has no store assigned', async () => {
    mockDashboardData({ merchantName: null });

    await renderWithAuth(
     <AuthProvider>
         <NotificationToastProvider>
           <MerchantDashboardPage />
         </NotificationToastProvider>
       </AuthProvider>,
     );

     await waitFor(() => {
       expect(
         screen.getByText(/Tu cuenta de comercio está en proceso de verificación/i),
       ).toBeInTheDocument();
     });

    expect(
      screen.getByText(/Si aún no has registrado tu negocio, contáctanos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Contactar por WhatsApp/i }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/Pedidos hoy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tienda Abierta/i)).not.toBeInTheDocument();
  });

  it('renders the normal dashboard instead of the verification card when a store is assigned', async () => {
    mockDashboardData({
      merchantName: 'La Pizza',
      isOpen: true,
      activeProducts: 8,
    });

    await renderWithAuth(
     <AuthProvider>
         <NotificationToastProvider>
           <MerchantDashboardPage />
         </NotificationToastProvider>
       </AuthProvider>,
     );

     await waitFor(() => {
       expect(screen.getByText(/Hola, La Pizza/i)).toBeInTheDocument();
     });

    expect(
      screen.queryByText(/Tu cuenta de comercio está en proceso de verificación/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Tienda Abierta')).toBeInTheDocument();
  });
});
