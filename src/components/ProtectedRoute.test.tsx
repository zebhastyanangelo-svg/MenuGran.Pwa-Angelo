import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileRow, UserRole } from '../types/database';
import { ProtectedRoute } from './ProtectedRoute';

const authState: {
  user: { id: string; email: string } | null;
  profile: ProfileRow | null;
  isLoading: boolean;
} = {
  user: null,
  profile: null,
  isLoading: false,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

function buildProfile(role: UserRole): ProfileRow {
  return {
    id: 'user-1',
    email: 'user@menugram.com',
    full_name: 'Usuario',
    avatar_url: null,
    role,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function renderRoute(redirectTo?: string): void {
  render(
    <MemoryRouter initialEntries={['/super-admin']}>
      <Routes>
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute requiredRole="superadmin" redirectTo={redirectTo}>
              <p data-testid="panel">Panel Super Admin</p>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<p data-testid="home">Inicio</p>} />
        <Route path="/admin" element={<p data-testid="admin">Admin merchant</p>} />
        <Route
          path="/login"
          element={<p data-testid="login">Iniciar sesión</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (ruta /super-admin)', () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
    authState.isLoading = false;
  });

  it('renderiza el panel cuando el rol de la sesión es superadmin', () => {
    authState.user = { id: 'user-1', email: 'admin@menugram.com' };
    authState.profile = buildProfile('superadmin');

    renderRoute();

    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('redirige al inicio cuando el rol es merchant_owner', () => {
    authState.user = { id: 'user-2', email: 'merchant@menugram.com' };
    authState.profile = buildProfile('merchant_owner');

    renderRoute('/');

    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('redirige al inicio cuando el rol es customer', () => {
    authState.user = { id: 'user-3', email: 'client@menugram.com' };
    authState.profile = buildProfile('customer');

    renderRoute('/');

    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('redirige a /login cuando no hay sesión activa', () => {
    renderRoute();

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('bloquea el acceso cuando el perfil aún no está cargado (sesión sin rol verificado)', () => {
    authState.user = { id: 'user-4', email: 'unknown@menugram.com' };
    authState.profile = null;

    renderRoute('/');

    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });
});
