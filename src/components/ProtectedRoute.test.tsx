import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MerchantStaffPermissions, ProfileRow, UserRole } from '../types/database';
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

let mockStaffPermissions: MerchantStaffPermissions | null = null;
let mockIsLoadingPermissions = false;

vi.mock('../hooks/useStaffPermissions', () => ({
  useStaffPermissions: () => ({
    permissions: mockStaffPermissions,
    isLoading: mockIsLoadingPermissions,
  }),
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
        <Route path="/driver" element={<p data-testid="driver">Panel Reparto</p>} />
        <Route
          path="/login"
          element={<p data-testid="login">Iniciar sesión</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderAdminRoute(): void {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={['merchant_owner', 'merchant_staff', 'superadmin']}>
              <p data-testid="admin-panel">Admin Panel</p>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<p data-testid="home">Inicio</p>} />
        <Route path="/driver" element={<p data-testid="driver">Panel Reparto</p>} />
        <Route path="/login" element={<p data-testid="login">Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (ruta /super-admin)', () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
    authState.isLoading = false;
    mockStaffPermissions = null;
    mockIsLoadingPermissions = false;
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

  it('redirige al driver a /driver cuando intenta acceder a /admin', () => {
    authState.user = { id: 'user-5', email: 'driver@menugram.com' };
    authState.profile = buildProfile('driver');

    renderAdminRoute();

    expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('driver')).toBeInTheDocument();
  });

  it('redirige al driver a /driver cuando intenta acceder a /super-admin', () => {
    authState.user = { id: 'user-6', email: 'driver@menugram.com' };
    authState.profile = buildProfile('driver');

    renderRoute();

    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('driver')).toBeInTheDocument();
  });
});

describe('ProtectedRoute (permisos de staff)', () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
    authState.isLoading = false;
    mockStaffPermissions = null;
    mockIsLoadingPermissions = false;
  });

  function renderPermissionRoute(permission?: keyof MerchantStaffPermissions): void {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute
                requiredRole={['merchant_owner', 'merchant_staff']}
                requiredPermission={permission}
              >
                <p data-testid="resumen-panel">Resumen Panel</p>
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<p data-testid="admin-home">Admin Home</p>} />
          <Route path="/" element={<p data-testid="home">Inicio</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('permite el acceso a merchant_owner sin verificar permisos', () => {
    authState.user = { id: 'owner-1', email: 'owner@menugram.com' };
    authState.profile = buildProfile('merchant_owner');

    renderPermissionRoute('can_view_metrics');

    expect(screen.getByTestId('resumen-panel')).toBeInTheDocument();
  });

  it('permite el acceso a merchant_staff con el permiso requerido', () => {
    authState.user = { id: 'staff-1', email: 'staff@menugram.com' };
    authState.profile = buildProfile('merchant_staff');
    mockStaffPermissions = {
      can_manage_menu: true,
      can_view_orders: true,
      can_manage_orders: true,
      can_manage_settings: true,
      can_view_metrics: true,
    };

    renderPermissionRoute('can_view_metrics');

    expect(screen.getByTestId('resumen-panel')).toBeInTheDocument();
  });

  it('redirige a /admin a merchant_staff sin el permiso requerido', () => {
    authState.user = { id: 'staff-2', email: 'staff2@menugram.com' };
    authState.profile = buildProfile('merchant_staff');
    mockStaffPermissions = {
      can_manage_menu: true,
      can_view_orders: true,
      can_manage_orders: false,
      can_manage_settings: false,
      can_view_metrics: false,
    };

    renderPermissionRoute('can_view_metrics');

    expect(screen.queryByTestId('resumen-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-home')).toBeInTheDocument();
  });

  it('redirige a /admin a merchant_staff sin permisos cargados', () => {
    authState.user = { id: 'staff-3', email: 'staff3@menugram.com' };
    authState.profile = buildProfile('merchant_staff');
    mockStaffPermissions = null;

    renderPermissionRoute('can_view_metrics');

    expect(screen.queryByTestId('resumen-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-home')).toBeInTheDocument();
  });
});
