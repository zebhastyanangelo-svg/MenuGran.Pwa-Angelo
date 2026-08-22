import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import type { AuthContextValue } from '../../context/auth-context-core';
import { AuthForm } from './AuthForm';
import { useAuth } from '../../hooks/useAuth';

const signInWithPassword = vi.fn();
const signUpWithPassword = vi.fn();
const resendConfirmationEmail = vi.fn();
const signInWithGoogle = vi.fn();
const navigate = vi.fn();
const fetchCurrentSessionRole = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../context/auth-profile', () => ({
  fetchCurrentSessionRole: (args: unknown) => fetchCurrentSessionRole(args),
}));

const mockUseSearchParams = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigate,
    useSearchParams: () => mockUseSearchParams(),
  };
});

function getMockAuth(): AuthContextValue {
  return {
    user: null,
    profile: null,
    isLoading: false,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    resendConfirmationEmail,
    signOut: vi.fn(),
  };
}

function renderWithRouter(defaultTab: 'login' | 'register' = 'login', from: string | null = '/marketplace') {
  mockUseSearchParams.mockReturnValue([
    { get: (key: string) => (key === 'from' && from !== null ? from : null) },
    vi.fn(),
  ] as unknown as ReturnType<typeof useSearchParams>);

  const search = from !== null ? `?from=${encodeURIComponent(from)}` : '';
  const path = defaultTab === 'login' ? '/login' : '/register';

  render(
    <MemoryRouter initialEntries={[`${path}${search}`]}>
      <Routes>
        <Route path="/login" element={<AuthForm defaultTab="login" />} />
        <Route path="/register" element={<AuthForm defaultTab="register" />} />
        <Route path="/marketplace" element={<div data-testid="marketplace">Marketplace</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/merchant/dashboard" element={<div data-testid="merchant-dashboard">Panel del comerciante</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(getMockAuth());
    fetchCurrentSessionRole.mockResolvedValue('customer');
  });

  it('renderiza el encabezado de Iniciar Sesión por defecto', () => {
    renderWithRouter('login');
    expect(screen.getByRole('heading', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });

  it('renderiza el encabezado de Registrarse cuando defaultTab es register', () => {
    renderWithRouter('register');
    expect(screen.getByRole('heading', { name: /Registrarse/i })).toBeInTheDocument();
  });

  it('permite alternar de login a register navegando a /register', async () => {
    const user = userEvent.setup();
    renderWithRouter('login');

    await user.click(screen.getByRole('button', { name: /Registrarse/i }));

    expect(navigate).toHaveBeenCalledWith('/register', { replace: true });
  });

  it('permite alternar de register a login navegando a /login', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    await user.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('renderiza el botón Continuar con Google y el separador en login', () => {
    renderWithRouter('login');

    expect(
      screen.getByRole('button', { name: /Continuar con Google/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('o ingresa con tu correo')).toBeInTheDocument();
  });

  it('renderiza el botón de Google también en el tab de registro', () => {
    renderWithRouter('register');

    expect(
      screen.getByRole('button', { name: /Continuar con Google/i }),
    ).toBeInTheDocument();
  });

  it('llama a signInWithGoogle al hacer clic en Continuar con Google', async () => {
    const user = userEvent.setup();
    signInWithGoogle.mockResolvedValueOnce(undefined);
    renderWithRouter('login');

    await user.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('muestra spinner y deshabilita el botón de Google mientras carga', async () => {
    signInWithGoogle.mockImplementation(() => new Promise(() => {}));
    renderWithRouter('login');

    await userEvent.click(
      screen.getByRole('button', { name: /Continuar con Google/i }),
    );

    expect(screen.getByText('Conectando con Google...')).toBeInTheDocument();
    expect(screen.getByTestId('google-signin')).toBeDisabled();
  });

  it('muestra mensaje de error claro cuando el inicio con Google falla', async () => {
    const user = userEvent.setup();
    signInWithGoogle.mockRejectedValueOnce(new Error('OAuth provider unavailable'));
    renderWithRouter('login');

    await user.click(screen.getByRole('button', { name: /Continuar con Google/i }));

    expect(
      await screen.findByText(/OAuth provider unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('google-signin')).not.toBeDisabled();
  });

  it('envía credenciales de login con signInWithPassword y redirige al marketplace', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce(undefined);
    renderWithRouter('login', '/marketplace');

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    expect(signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/marketplace', { replace: true });
    });
  });

  it('redirige a la ruta "from" tras login exitoso', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce(undefined);
    renderWithRouter('login', '/merchant/dashboard');

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/merchant/dashboard', { replace: true });
    });
  });

  it('redirige a /super-admin tras el login del Super Admin sin ruta "from"', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce(undefined);
    fetchCurrentSessionRole.mockResolvedValue('superadmin');
    renderWithRouter('login', null);

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'admin@menugram.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    expect(fetchCurrentSessionRole).toHaveBeenCalled();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/super-admin', { replace: true });
    });
  });

  it('redirige al marketplace tras login de cliente sin ruta "from"', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce(undefined);
    fetchCurrentSessionRole.mockResolvedValue('customer');
    renderWithRouter('login', null);

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'client@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/marketplace', { replace: true });
    });
  });

  it('honra la ruta "from" aunque el rol sea superadmin', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce(undefined);
    fetchCurrentSessionRole.mockResolvedValue('superadmin');
    renderWithRouter('login', '/orders/o-1');

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'admin@menugram.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/orders/o-1', { replace: true });
    });
  });

  it('renderiza el formulario de registro con campos de cliente (Nombre, Email, Contraseña, C.I., Teléfono)', async () => {
    renderWithRouter('register');

    // Form should have exactly the customer fields
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.I./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();

    // No merchant fields should be visible
    expect(screen.queryByLabelText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dirección/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono WhatsApp/i)).not.toBeInTheDocument();
  });

  it('muestra el banner de contacto al final del formulario de registro', async () => {
    renderWithRouter('register');

    // The support banner should be present
    expect(screen.getByText(/Quieres vender tu comida en MenuGran/i)).toBeInTheDocument();
    expect(screen.getByText(/Contacta al equipo de soporte/i)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
  });

  it('redirige al marketplace tras registro exitoso de cliente', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: false });
    renderWithRouter('register');

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Usuario Test');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.type(screen.getByLabelText(/C.I./i), 'V-12345678');
    await user.type(screen.getByLabelText(/Teléfono/i), '+58 412-123-4567');
    await user.click(screen.getByTestId('register-submit'));

    expect(signUpWithPassword).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      'Usuario Test',
      'customer',
    );
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/marketplace', { replace: true });
    });
  });

  it('nunca permite autorregistrarse como superadmin desde el registro público', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: false });
    renderWithRouter('register', null);

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Impostor');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'impostor@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.type(screen.getByLabelText(/C.I./i), 'V-00000000');
    await user.type(screen.getByLabelText(/Teléfono/i), '+58 412-000-0000');
    await user.click(screen.getByTestId('register-submit'));

    expect(signUpWithPassword).toHaveBeenCalledWith(
      'impostor@example.com',
      'password123',
      'Impostor',
      'customer',
    );
  });

  it('cambiar a la pestaña de Register siempre muestra solo los campos de cliente', async () => {
    renderWithRouter('register');

    // The register tab is already active by default

    // Customer fields should be visible
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.I./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();

    // No merchant fields should be visible
    expect(screen.queryByLabelText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dirección/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono WhatsApp/i)).not.toBeInTheDocument();
  });

  it('no debe renderizar el campo "Tipo de cuenta" eliminado', async () => {
    renderWithRouter('register');

    // The "Tipo de cuenta" select was removed; only login/register tabs exist
    expect(screen.queryByLabelText(/Tipo de cuenta/i)).not.toBeInTheDocument();

    // But the tab buttons should still exist (login/register)
    // Note: there are two buttons with "Registrarse" text (tab + submit), so we check both exist
    const registerButtons = screen.getAllByRole('button', { name: /Registrarse/i });
    expect(registerButtons.length).toBe(2);
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument();
  });
});