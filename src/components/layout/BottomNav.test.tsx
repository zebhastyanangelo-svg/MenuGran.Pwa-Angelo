import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const useAuthMock = vi.fn();

vi.mock('../../hooks/useStaffPermissions', () => ({
  useStaffPermissions: () => ({ permissions: null, isLoading: false }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la navegación de cliente (Inicio, Carrito, Perfil)', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'customer' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
  });

  it('usa la navegación de comercio y oculta Carrito para merchant_owner', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'merchant_owner' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /panel/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
  });

  it('marca como activo el enlace de la ruta actual', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'customer' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveClass('text-brand-red');
  });

  it('usa el atributo de navegación principal', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'customer' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
  });

  it('muestra el botón de Cerrar Sesión en móvil para merchant_owner', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'merchant_owner' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it('muestra el botón de Cerrar Sesión en móvil para merchant_staff', () => {
    useAuthMock.mockReturnValue({
      profile: { role: 'merchant_staff' },
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it('no muestra el botón de Cerrar Sesión para visitantes no autenticados', () => {
    useAuthMock.mockReturnValue({ profile: null, user: null, signOut: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', { name: /cerrar sesión/i }),
    ).not.toBeInTheDocument();
  });
});
