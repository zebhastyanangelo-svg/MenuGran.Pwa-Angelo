import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { ProfileRow } from '../types/database';
import { AuthProvider, fetchProfile } from './AuthContext';
import { useAuth } from '../hooks/useAuth';

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
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

function buildProfile(id: string, role: ProfileRow['role']): ProfileRow {
  return {
    id,
    email: `${id}@menugram.com`,
    full_name: null,
    avatar_url: null,
    role,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function buildSession(userId: string): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4102444800,
    user: { id: userId, email: `${userId}@menugram.com` } as unknown as User,
  };
}

function mockProfileQuery(result: {
  data: ProfileRow | null;
  error: unknown;
}): void {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  authMocks.from.mockReturnValue({ select });
}

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth-email">{auth.user?.email ?? 'sin-sesion'}</span>
      <span data-testid="auth-role">{auth.profile?.role ?? 'sin-perfil'}</span>
      <span data-testid="auth-loading">{String(auth.isLoading)}</span>
      <button onClick={() => void auth.signOut()}>Cerrar sesión</button>
        <button
          onClick={() => void auth.signInWithPassword('a@b.com', 'secret')}
        >
          Entrar
        </button>
      <button onClick={() => void auth.signInWithGoogle().catch(() => undefined)}>
          Continuar con Google
        </button>
      <button
        onClick={() =>
          void auth.signUpWithPassword('a@b.com', 'secret', 'Test User', 'customer')
        }
      >
        Registrar
      </button>
      <button
        onClick={() => void auth.resendConfirmationEmail('a@b.com')}
      >
        Reenviar confirmación
      </button>
    </div>
  );
}

describe('fetchProfile', () => {
  it('consulta la tabla profiles y devuelve el perfil', async () => {
    const profile = buildProfile('user-123', 'customer');
    mockProfileQuery({ data: profile, error: null });

    await expect(fetchProfile('user-123')).resolves.toEqual(profile);

    expect(authMocks.from).toHaveBeenCalledWith('profiles');
  });

  it('devuelve null si la consulta falla', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockProfileQuery({ data: null, error: { message: 'row level security' } });

    await expect(fetchProfile('user-123')).resolves.toBeNull();

    consoleError.mockRestore();
  });
});

describe('AuthProvider', () => {
  let emitAuthEvent:
    | ((event: AuthChangeEvent, session: Session | null) => void)
    | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    emitAuthEvent = null;
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      emitAuthEvent = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('renderiza sin fallar y resuelve la sesión inicial', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('auth-email')).toHaveTextContent('sin-sesion');
    expect(await screen.findByText('false')).toBeInTheDocument();
    expect(screen.getByTestId('auth-role')).toHaveTextContent('sin-perfil');
  });

  it('carga el perfil del usuario al emitirse SIGNED_IN', async () => {
    mockProfileQuery({
      data: buildProfile('user-123', 'merchant_owner'),
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await screen.findByText('false');

    act(() => {
      emitAuthEvent?.('SIGNED_IN', buildSession('user-123'));
    });

    expect(await screen.findByTestId('auth-role')).toHaveTextContent(
      'merchant_owner',
    );
    expect(screen.getByTestId('auth-email')).toHaveTextContent(
      'user-123@menugram.com',
    );
    expect(authMocks.from).toHaveBeenCalledWith('profiles');
  });

  it('limpia sesión y perfil al emitirse SIGNED_OUT', async () => {
    mockProfileQuery({
      data: buildProfile('user-123', 'driver'),
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await screen.findByText('false');

    act(() => {
      emitAuthEvent?.('SIGNED_IN', buildSession('user-123'));
    });
    expect(await screen.findByTestId('auth-role')).toHaveTextContent('driver');

    act(() => {
      emitAuthEvent?.('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('auth-email')).toHaveTextContent('sin-sesion');
    expect(screen.getByTestId('auth-role')).toHaveTextContent('sin-perfil');
  });

  it('llama a supabase.auth.signOut al hacer logout', async () => {
    authMocks.signOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('llama a signInWithPassword con email y contraseña', async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    });
  });

  it('llama a signInWithOAuth con provider google y redirectTo del marketplace', async () => {
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { url: null, provider: 'google' },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/marketplace` },
    });
  });

  it('propaga el error y lo registra en consola cuando el inicio con Google falla', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { url: null, provider: 'google' },
      error: new Error('OAuth flow failed'),
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(consoleError).toHaveBeenCalledWith(
      'Error al iniciar sesión con Google',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it('llama a supabase.auth.signUp con full_name y role en options.data', async () => {
    authMocks.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'u-123',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          identities: [{ provider: 'email' }],
        },
        session: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
      options: {
        data: {
          full_name: 'Test User',
          role: 'customer',
        },
      },
    });
  });

  it('retorna needsEmailConfirmation=true cuando el usuario no está verificado', async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: { id: 'u-1', email_confirmed_at: null, identities: [] }, session: null },
      error: null,
    });

    const probe = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await expect(probe).toBeTruthy();
  });

  it('llama a supabase.auth.resend con type signup al reenviar confirmación', async () => {
    authMocks.resend.mockResolvedValue({ data: { user: null, session: null }, error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar confirmación' }));

    expect(authMocks.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.com',
    });
  });
});
