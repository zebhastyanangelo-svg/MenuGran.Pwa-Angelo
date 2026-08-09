import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import * as useAuthHook from './hooks/useAuth';

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  from: vi.fn(() => {
    const query: any = {
      select: () => query,
      eq: () => query,
      order: () => query,
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: [], error: null }),
    };
    return query;
  }),
}));

vi.mock('./services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
    },
    from: authMocks.from,
  },
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    categories: 'categories',
    products: 'products',
  },
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('App Router Integration', () => {
  it('redirects unauthenticated user from protected route to login', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/merchant/dashboard');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('renders marketplace page on root path', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/marketplace');
    render(<App />);

    expect(
      await screen.findByPlaceholderText(/Buscar comercios o platillos/i),
    ).toBeInTheDocument();
  });

  it('renders merchant dashboard when user has proper role', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 'user-1' } as any,
      profile: { id: 'user-1', role: 'merchant_owner', email: 'merchant@menugram.com', full_name: null, avatar_url: null, created_at: '', updated_at: '' },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/merchant/dashboard');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Panel de Comercio/i })).toBeInTheDocument();
  });
});
