import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import { useAuth } from './hooks/useAuth';
import type { AuthContextValue } from './context/auth-context-core';

const createQuery = () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    update: () => query,
    then: (resolve: (v: unknown) => unknown) => {
      resolve({ data: [], error: null });
    },
  };
  return query;
};

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  from: vi.fn(() => createQuery()),
}));

vi.mock('./services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
    },
    from: authMocks.from,
    storage: { from: vi.fn() },
  },
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    orders: 'orders',
    categories: 'categories',
    products: 'products',
  },
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./components/map/LocationPicker', () => ({
  LocationPicker: () => <div data-testid="mock-location-picker" />,
}));

vi.mock('./utils/imageCompressor', () => ({
  compressImage: vi.fn().mockResolvedValue({
    blob: new Blob(['fake'], { type: 'image/jpeg' }),
    size: 50_000,
    width: 800,
    height: 600,
    type: 'image/jpeg',
  }),
  PAYMENT_PROOF_MAX_BYTES: 150 * 1024,
  buildProofFileName: vi.fn().mockImplementation((orderId: string) => `${orderId}/proof.jpg`),
}));

vi.mock('./hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    totalAmount: '0.00',
    totalItems: 0,
    merchantId: null,
    validationError: null,
    canCheckout: true,
    clearCart: vi.fn(),
  }),
}));

describe('App Router Integration', () => {
  const setAuth = (value: Partial<AuthContextValue>) => {
    vi.mocked(useAuth).mockReturnValue(value as AuthContextValue);
  };

  const baseAuthValue = {
    user: null,
    profile: null,
    isLoading: false,
    signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signOut: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
    window.history.replaceState({}, '/', '/');
  });

  it('redirects unauthenticated user from protected route to login', async () => {
    setAuth(baseAuthValue);

    window.history.pushState({}, '', '/merchant/dashboard');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Iniciar Sesión/i }, { timeout: 10000 })).toBeInTheDocument();
  }, 15000);

  it('redirects authenticated user from root to marketplace', async () => {
    setAuth({
      ...baseAuthValue,
      user: { id: 'user-auth', email: 'user@example.com' } as never,
      profile: {
        id: 'user-auth',
        role: 'customer',
        email: 'user@example.com',
        full_name: 'Test User',
        avatar_url: null,
        created_at: '',
        updated_at: '',
      },
      isLoading: false,
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByPlaceholderText(/Buscar comercios o platillos/i, {}, { timeout: 30000 })).toBeInTheDocument();
  }, 45000);

  it('renders marketplace page on root path', async () => {
    setAuth(baseAuthValue);

    window.history.pushState({}, '', '/marketplace');
    render(<App />);

     expect(
       await screen.findByPlaceholderText(/Buscar comercios o platillos/i, {}, { timeout: 30000 }),
     ).toBeInTheDocument();
  }, 45000);

  it('renders merchant dashboard when user has proper role', async () => {
    setAuth({
      user: { id: 'user-1' } as never,
      profile: {
        id: 'user-1',
        role: 'merchant_owner',
        email: 'merchant@menugram.com',
        full_name: null,
        avatar_url: null,
        created_at: '',
        updated_at: '',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/merchant/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Panel de Comercio/i })).toBeInTheDocument();
    }, { timeout: 30000 });
  }, 45000);

  it('resolves lazy login route through Suspense and renders its content', async () => {
    setAuth(baseAuthValue);

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('resolves lazy checkout route through Suspense and renders its content', async () => {
    setAuth({
      user: { id: 'user-1' } as never,
      profile: {
        id: 'user-1',
        role: 'customer',
        email: 'user@example.com',
        full_name: 'Test User',
        avatar_url: null,
        created_at: '',
        updated_at: '',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/checkout');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Finalizar pedido/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('resolves lazy not-found route through Suspense', async () => {
    setAuth(baseAuthValue);

    window.history.pushState({}, '', '/unknown-route-xyz');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);

  it('monta el componente Vercel Analytics sin interrumpir el render', async () => {
    setAuth(baseAuthValue);

    render(<App />);

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
  }, 15000);
});
