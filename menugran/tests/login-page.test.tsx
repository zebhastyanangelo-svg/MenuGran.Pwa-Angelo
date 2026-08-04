// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const signInMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  signInMock.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

describe('LoginPage', () => {
  it('renderiza el título y los campos', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page');
    render(<LoginPage />);
    expect(screen.getByText(/Iniciar Sesion/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tucorreo@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('muestra error si el email está vacío', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page');
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => {
      expect(screen.getByText('Ingresa tu email')).toBeInTheDocument();
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('muestra error si la contraseña está vacía', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page');
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));
    await waitFor(() => {
      expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('llama a signIn al enviar credenciales válidas', async () => {
    signInMock.mockResolvedValue({ ok: true, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { role: 'CUSTOMER' } }),
    }));

    const { default: LoginPage } = await import('@/app/(auth)/login/page');
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), {
      target: { value: 'A@B.COM' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        email: 'a@b.com', // lowercased
        password: 'secret',
        redirect: false,
      });
    });
  });
});
