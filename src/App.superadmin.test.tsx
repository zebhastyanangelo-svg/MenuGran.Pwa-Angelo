import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { render } from './test/test-utils';
import App from './App';
import { useAuth } from './hooks/useAuth';
import type { AuthContextValue } from './context/auth-context-core';
import { ErrorBoundary } from './components/ErrorBoundary';

const createQuery = () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    update: () => query,
    single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
    then: (resolve: (v: unknown) => unknown) => {
      resolve({ data: [], error: null });
    },
  };
  return query;
};

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  from: vi.fn(),
}));

vi.mock('./services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
    },
    from: (...args: unknown[]) => authMocks.from(...args),
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useBlocker: vi.fn(() => ({ state: 'unblocked', reset: vi.fn() })),
  };
});

function buildSuperadminAuth(): Partial<AuthContextValue> {
  return {
    user: { id: 'sa-1', email: 'zebhastyanangelo@gmail.com' } as never,
    profile: {
      id: 'sa-1',
      email: 'zebhastyanangelo@gmail.com',
      full_name: 'Angelo',
      avatar_url: null,
      role: 'superadmin',
      created_at: '',
      updated_at: '',
    },
    isLoading: false,
    signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    signOut: vi.fn(),
  };
}

describe('App · flujo Super Admin', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
    window.history.replaceState({}, '/', '/');
    window.history.pushState({}, '', '/');
  });

  it('redirige al Super Admin desde / hacia su dashboard de métricas con menú sin carrito', async () => {
    vi.mocked(useAuth).mockReturnValue(buildSuperadminAuth() as AuthContextValue);
    authMocks.from.mockImplementation(() => createQuery());

    window.history.pushState({}, '', '/');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /Métricas Globales/i }, { timeout: 15000 }),
    ).toBeInTheDocument();
    // Menú lateral con Inicio, Negocios y Perfil.
    expect(screen.getAllByRole('link', { name: /Negocios/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /^Inicio$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /^Perfil$/i }).length).toBeGreaterThan(0);
    // Sin botón flotante de carrito para el Super Admin.
    expect(
      screen.queryByRole('button', { name: /abrir carrito/i }),
    ).not.toBeInTheDocument();
  }, 30000);

  it('renderiza /super-admin sin pantalla en blanco aunque las consultas fallen', async () => {
    vi.mocked(useAuth).mockReturnValue(buildSuperadminAuth() as AuthContextValue);
    authMocks.from.mockImplementation(() => {
      throw new Error('network down');
    });

    window.history.pushState({}, '', '/super-admin');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /Panel de Super Admin/i }, { timeout: 15000 }),
    ).toBeInTheDocument();
    // La página no se cae: muestra el estado de error en el listado.
    await screen.findByRole('alert');
  }, 30000);

  it('muestra el cargador de perfil cuando hay usuario pero el rol aún no llegó', () => {
    const auth = buildSuperadminAuth();
    vi.mocked(useAuth).mockReturnValue({
      ...auth,
      profile: null,
    } as AuthContextValue);
    authMocks.from.mockImplementation(() => createQuery());

    window.history.pushState({}, '', '/');
    render(<App />);

    // Sin perfil verificado no se renderiza ninguna vista por rol ni se
    // rebota al login: se espera la resolución del perfil (sin pantalla blanca).
    expect(screen.getByText(/Cargando perfil/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Buscar comercios o platillos/i)).not.toBeInTheDocument();
  });

  it('el ErrorBoundary captura errores de render sin pantalla en blanco', () => {
    vi.mocked(useAuth).mockReturnValue(buildSuperadminAuth() as AuthContextValue);
    authMocks.from.mockImplementation(() => createQuery());

    function BrokenComponent(): never {
      throw new Error('fallo simulado');
    }

    window.history.pushState({}, '', '/marketplace');
    render(
      <>
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      </>,
    );

    expect(screen.getByRole('heading', { name: /Algo salió mal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recargar la aplicación/i })).toBeInTheDocument();
  });
});
