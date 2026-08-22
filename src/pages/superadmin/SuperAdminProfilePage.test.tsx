import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileRow } from '../../types/database';
import { SuperAdminProfilePage } from './SuperAdminProfilePage';

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  updateAuthPassword: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'sa-1', email: 'zebhastyanangelo@gmail.com' },
    profile: buildProfile(),
    isLoading: false,
    signOut: authMocks.signOut,
  }),
}));

vi.mock('../../services/superAdminMetricsService', () => ({
  updateAuthPassword: serviceMocks.updateAuthPassword,
}));

function buildProfile(): ProfileRow {
  return {
    id: 'sa-1',
    email: 'zebhastyanangelo@gmail.com',
    full_name: 'Angelo',
    avatar_url: null,
    role: 'superadmin',
    created_at: '',
    updated_at: '',
  };
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/super-admin/profile']}>
      <Routes>
        <Route path="/super-admin/profile" element={<SuperAdminProfilePage />} />
        <Route path="/login" element={<div data-testid="login-page">Iniciar Sesión</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function submitPassword(newPassword: string, confirmPassword: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(
    screen.getByPlaceholderText(/mínimo 8 caracteres/i),
    newPassword,
  );
  await user.type(
    screen.getByPlaceholderText(/^Confirmar nueva contraseña$/i),
    confirmPassword,
  );
  await user.click(
    screen.getByRole('button', { name: /actualizar contraseña/i }),
  );
}

describe('SuperAdminProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.updateAuthPassword.mockResolvedValue(undefined);
  });

  it('muestra los datos del Super Admin (nombre, email y rol)', () => {
    renderPage();

    expect(screen.getByTestId('profile-name')).toHaveTextContent('Angelo');
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'zebhastyanangelo@gmail.com',
    );
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThan(0);
  });

  it('muestra el botón de Cerrar Sesión de forma visible', () => {
    renderPage();

    expect(screen.getByTestId('superadmin-logout')).toBeEnabled();
  });

  it('cierra sesión y navega al login al pulsar Cerrar Sesión', async () => {
    authMocks.signOut.mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(screen.getByTestId('superadmin-logout'));

    expect(authMocks.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('valida que las contraseñas coincidan antes de enviar', async () => {
    renderPage();

    await submitPassword('ClaveSegura1', 'Distinta99');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las contraseñas no coinciden.',
    );
    expect(serviceMocks.updateAuthPassword).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas menores a 8 caracteres', async () => {
    renderPage();

    await submitPassword('corta12', 'corta12');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'al menos 8 caracteres',
    );
    expect(serviceMocks.updateAuthPassword).not.toHaveBeenCalled();
  });

  it('actualiza la contraseña y muestra confirmación', async () => {
    renderPage();

    await submitPassword('NuevaClave123', 'NuevaClave123');

    expect(serviceMocks.updateAuthPassword).toHaveBeenCalledWith('NuevaClave123');
    expect(await screen.findByTestId('password-feedback')).toHaveTextContent(
      'Contraseña actualizada correctamente.',
    );
  });

  it('muestra el error del servicio si la actualización falla', async () => {
    serviceMocks.updateAuthPassword.mockRejectedValue(
      new Error('Error al actualizar la contraseña: too weak'),
    );

    renderPage();

    await submitPassword('NuevaClave123', 'NuevaClave123');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al actualizar la contraseña: too weak',
    );
  });
});
