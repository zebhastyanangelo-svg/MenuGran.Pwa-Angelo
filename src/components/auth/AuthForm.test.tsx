import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { AuthForm } from './AuthForm';
import { useAuth } from '../../hooks/useAuth';
import type { AuthContextValue } from '../../context/AuthContext';

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

  it('envía full_name y role en signUpWithPassword al registrarse', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: false });
    renderWithRouter('register', '/marketplace');

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'juan@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.selectOptions(screen.getByLabelText(/Tipo de cuenta/i), 'customer');
    await user.click(screen.getByTestId('register-submit'));

    expect(signUpWithPassword).toHaveBeenCalledWith(
      'juan@example.com',
      'password123',
      'Juan Pérez',
      'customer',
    );
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/marketplace', { replace: true });
    });
  });

  it('envía el rol merchant_owner al registrarse como comercio', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: false });
    renderWithRouter('register', '/marketplace');

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Ana García');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.selectOptions(screen.getByLabelText(/Tipo de cuenta/i), 'merchant_owner');
    await user.click(screen.getByTestId('register-submit'));

    expect(signUpWithPassword).toHaveBeenCalledWith(
      'ana@example.com',
      'password123',
      'Ana García',
      'merchant_owner',
    );
  });

  it('muestra spinner y deshabilita el botón durante el login', async () => {
    signInWithPassword.mockImplementation(() => new Promise(() => {}));
    renderWithRouter('login');

    await userEvent.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await userEvent.click(screen.getByTestId('login-submit'));

    expect(screen.getByText('Entrando...')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  });

  it('muestra el error cuando el login falla', async () => {
    signInWithPassword.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderWithRouter('login');

    await userEvent.type(screen.getByLabelText(/Correo electrónico/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'wrongpass');
    await userEvent.click(screen.getByTestId('login-submit'));

    expect(
      await screen.findByText(/Las credenciales son incorrectas/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('muestra mensaje de error cuando el correo ya existe', async () => {
    signUpWithPassword.mockRejectedValueOnce(
      new Error('User already registered'),
    );
    renderWithRouter('register');

    await userEvent.type(screen.getByLabelText(/Nombre completo/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/Correo electrónico/i), 'exists@example.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await userEvent.click(screen.getByTestId('register-submit'));

    expect(
      await screen.findByText(/ya está registrado/i),
    ).toBeInTheDocument();
  });

  it('muestra el spinner durante el registro', async () => {
    signUpWithPassword.mockImplementation(() => new Promise(() => {}));
    renderWithRouter('register');

    await userEvent.type(screen.getByLabelText(/Nombre completo/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await userEvent.click(screen.getByTestId('register-submit'));

    expect(screen.getByText('Registrando...')).toBeInTheDocument();
  });

  it('muestra sugerencia de corrección de dominio al registrar con typo', async () => {
    const user = userEvent.setup();
    renderWithRouter('register');

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Test User');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'user@gmai.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('register-submit'));

    expect(
      await screen.findByText(/¿Quisiste decir 'user@gmail.com'\?/i),
    ).toBeInTheDocument();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('muestra banner de confirmación y no navega cuando el email requiere confirmación', async () => {
    const user = userEvent.setup();
    signUpWithPassword.mockResolvedValueOnce({ needsEmailConfirmation: true });
    renderWithRouter('register', '/marketplace');

    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'juan@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.selectOptions(screen.getByLabelText(/Tipo de cuenta/i), 'customer');
    await user.click(screen.getByTestId('register-submit'));

    expect(
      await screen.findByText(/¡Registro exitoso!/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Revisa tu bandeja de entrada/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra mensaje de confirmación y botón de reenvío al iniciar sesión sin confirmar', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockRejectedValueOnce(
      Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' }),
    );
    renderWithRouter('login');

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'unconfirmed@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    expect(
      await screen.findByText(
        /Debes confirmar tu correo electrónico antes de ingresar/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('resend-confirmation')).toBeInTheDocument();
  });

  it('llama a resendConfirmationEmail al pulsar el botón de reenvío', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockRejectedValueOnce(
      Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' }),
    );
    resendConfirmationEmail.mockResolvedValueOnce(undefined);
    renderWithRouter('login');

    await user.type(screen.getByLabelText(/Correo electrónico/i), 'unconfirmed@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
    await user.click(screen.getByTestId('login-submit'));

    await screen.findByTestId('resend-confirmation');
    await user.click(screen.getByTestId('resend-confirmation'));

    expect(resendConfirmationEmail).toHaveBeenCalledWith('unconfirmed@example.com');
  });
});
