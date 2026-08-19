import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { AuthForm } from './AuthForm';
import { useAuth } from '../../hooks/useAuth';
import type { AuthContextValue } from '../../context/auth-context-core';

const signInWithPassword = vi.fn();
const signUpWithPassword = vi.fn();
const resendConfirmationEmail = vi.fn();
const signInWithGoogle = vi.fn();
const navigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
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

  it('renderiza 5 campos del formulario de cliente (Nombre, C.I., Email, Teléfono, Contraseña)', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    // Ensure we're on the customer tab
    const customerButton = screen.getByRole('button', { name: /Cliente/i });
    await user.click(customerButton);

    // Customer fields should be visible - exactly 5
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.I./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();

    // No merchant fields should be visible
    expect(screen.queryByLabelText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();
  });

  it('renderiza solo Nombre del Comercio, Email y Contraseña en la pestaña de Comercio', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    // Switch to Commerce tab
    const commerceButton = screen.getByRole('button', { name: /Comercio/i });
    await user.click(commerceButton);

    // Only the simplified merchant fields should be visible
    expect(screen.getByLabelText(/Nombre del Comercio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();

    // The removed merchant fields must not be present
    expect(screen.queryByLabelText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dirección/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono WhatsApp/i)).not.toBeInTheDocument();
    // C.I. remains a customer-only field
    expect(screen.queryByLabelText('C.I.')).not.toBeInTheDocument();
  });

  it('registra un comercio con los 3 campos simplificados y redirige a su panel', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: false });
    renderWithRouter('register');

    // Switch to Commerce tab
    const commerceButton = screen.getByRole('button', { name: /Comercio/i });
    await user.click(commerceButton);

    await user.type(screen.getByLabelText(/Nombre del Comercio/i), 'Mi Restaurante');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'comercio@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('register-submit'));

    expect(signUpWithPassword).toHaveBeenCalledWith(
      'comercio@example.com',
      'password123',
      'Mi Restaurante',
      'merchant_owner',
    );
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/merchant/dashboard', { replace: true });
    });
  });

  it('cambiar a la pestaña de Cliente muestra solo los 5 campos requeridos', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    // Click the Cliente tab first
    const customerButton = screen.getByRole('button', { name: /Cliente/i });
    await user.click(customerButton);

    // Customer fields should be visible - exactly 5 fields
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/C.I./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();

    // No merchant fields should be visible
    expect(screen.queryByLabelText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dirección/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono WhatsApp/i)).not.toBeInTheDocument();

    // Verify no "Tipo de cuenta" select exists (removed per new design)
    expect(screen.queryByLabelText(/Tipo de cuenta/i)).not.toBeInTheDocument();
  });

  it('cambiar a la pestaña de Comercio muestra solo los 3 campos y oculta los del cliente', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    // Click the Comercio tab
    const commerceButton = screen.getByRole('button', { name: /Comercio/i });
    await user.click(commerceButton);

    // Only the simplified merchant fields are visible
    expect(screen.getByText(/Nombre del Comercio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();

    // The removed structured merchant fields must not be present
    expect(screen.queryByText(/RIF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Descripción/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dirección/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modalidades de servicio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Horario de atención/i)).not.toBeInTheDocument();
    // C.I. and Teléfono remain customer-only fields
    expect(screen.queryByText('C.I.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Teléfono$/i)).not.toBeInTheDocument();
  });

  it('validar que los campos de comercio no estén en el DOM cuando el rol es cliente', async () => {
    const user = userEvent.setup();
    renderWithRouter('register', '/marketplace');

    // Click the Cliente tab first
    const customerButton = screen.getByRole('button', { name: /Cliente/i });
    await user.click(customerButton);

    const merchantFields = [
      'RIF',
      'Categoría',
      'Descripción',
      'Dirección',
      'Teléfono WhatsApp',
      'Modalidades de servicio',
      'Horario de atención',
    ];
    for (const field of merchantFields) {
      expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
    }
  });

  it('validar que los campos de cliente no estén en el DOM cuando el rol es comerciante', async () => {
    const user = userEvent.setup();
    renderWithRouter('register', '/marketplace');

    // Click the Comercio tab first
    const commerceButton = screen.getByRole('button', { name: /Comercio/i });
    await user.click(commerceButton);

    // C.I. and Teléfono remain customer-only fields; Nombre completo is now shared
    const customerFields = ['C.I.', 'Teléfono'];
    for (const field of customerFields) {
      expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
    }
  });

  it('no debe renderizar el campo "Tipo de cuenta" eliminado', async () => {
    renderWithRouter('register');

    // The "Tipo de cuenta" select was removed; only tabs at top control view
    expect(screen.queryByLabelText(/Tipo de cuenta/i)).not.toBeInTheDocument();

    // But the tab buttons should still exist
    expect(screen.getByRole('button', { name: /Cliente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comercio/i })).toBeInTheDocument();
  });
});