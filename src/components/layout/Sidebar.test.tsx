import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ProfileRow } from '../../types/database';

const signOutMock = vi.fn();

const useAuthMock = vi.fn();

vi.mock('../../hooks/useStaffPermissions', () => ({
  useStaffPermissions: () => ({ permissions: null, isLoading: false }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

import { Sidebar } from './Sidebar';

function buildProfile(role: ProfileRow['role']): ProfileRow {
  return {
    id: 'u1',
    email: 'u@menugram.com',
    full_name: 'Usuario',
    avatar_url: null,
    role,
    created_at: '',
    updated_at: '',
  };
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la marca MenuGram', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('customer'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('MenuGram')).toBeInTheDocument();
  });

  it('renderiza la navegación de cliente (Inicio, Carrito, Perfil) y oculta el Panel', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('customer'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /panel/i })).not.toBeInTheDocument();
  });

  it('oculta Carrito y Panel para merchant_owner y muestra la navegación de comercio', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_owner'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /carrito/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /panel/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
  });

  it('usa la navegación de comercio para merchant_staff restringiendo secciones por permisos', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_staff'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /carrito/i })).not.toBeInTheDocument();
    // Configuración y Perfil son ownerOnly; los permisos del empleado aún no cargaron.
    expect(screen.queryByRole('link', { name: /configuración/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /perfil/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
  });

  it('muestra el botón de Cerrar Sesión para merchant_owner', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_owner'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it('muestra el botón de Cerrar Sesión para merchant_staff', () => {
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_staff'),
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it('no muestra el botón de Cerrar Sesión para visitantes no autenticados', () => {
    useAuthMock.mockReturnValue({ profile: null, user: null, signOut: vi.fn() });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', { name: /cerrar sesión/i }),
    ).not.toBeInTheDocument();
  });

  it('ejecuta signOut y navega a /login al pulsar Cerrar Sesión (merchant_owner)', async () => {
    signOutMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_owner'),
      signOut: signOutMock,
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<Sidebar />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(signOutMock).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('ejecuta signOut y navega a /login al pulsar Cerrar Sesión (merchant_staff)', async () => {
    signOutMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      profile: buildProfile('merchant_staff'),
      signOut: signOutMock,
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<Sidebar />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(signOutMock).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
