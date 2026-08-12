import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { AuthForm } from './AuthForm';
import { useAuth } from '../../hooks/useAuth';
import type { AuthContextValue } from '../../context/AuthContext';

const signInWithPassword = vi.fn();
const signUpWithPassword = vi.fn();
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
    signInWithGoogle: vi.fn(),
    signInWithPassword,
    signUpWithPassword,
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
    signUpWithPassword.mockResolvedValueOnce(undefined);
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
    signUpWithPassword.mockResolvedValueOnce(undefined);
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
});
