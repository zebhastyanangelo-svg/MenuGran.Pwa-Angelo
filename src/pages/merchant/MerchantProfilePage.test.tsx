import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MerchantProfilePage } from './MerchantProfilePage';
import type { MerchantContext } from '../../services/merchantStaffService';

const serviceMocks = vi.hoisted(() => ({
  getMerchantContext: vi.fn(),
  updateAuthPassword: vi.fn(),
}));

vi.mock('../../services/merchantStaffService', () => ({
  getMerchantContext: serviceMocks.getMerchantContext,
}));

vi.mock('../../services/superAdminMetricsService', () => ({
  updateAuthPassword: serviceMocks.updateAuthPassword,
}));

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: authMocks.useAuth,
}));

const context: MerchantContext = {
  merchantId: 'm-1',
  merchantName: 'La Pizzería de María',
  isOwner: true,
};

describe('MerchantProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.useAuth.mockReturnValue({
      user: { id: 'owner-1', email: 'owner@pizzeria.com' },
      profile: {
        id: 'owner-1',
        email: 'owner@pizzeria.com',
        full_name: 'María González',
        role: 'merchant_owner',
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    });
    serviceMocks.getMerchantContext.mockResolvedValue(context);
    serviceMocks.updateAuthPassword.mockResolvedValue(undefined);
  });

  it('muestra los datos personales del comercio en una tarjeta centrada', async () => {
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByTestId('profile-name', undefined, { timeout: 5000 }),
    ).toHaveTextContent('María González');
    expect(screen.getByTestId('profile-email')).toHaveTextContent(
      'owner@pizzeria.com',
    );
    expect(screen.getByTestId('profile-role')).toHaveTextContent(
      'Dueño de Comercio',
    );
    expect(screen.getByText('La Pizzería de María')).toBeInTheDocument();
  });

  it('muestra la tarjeta de cambio de contraseña para el dueño', async () => {
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('form', { name: /formulario de cambio de contraseña/i }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('input[name="newPassword"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('input[name="confirmPassword"]'),
    ).toBeInTheDocument();
  });

  it('oculta la tarjeta de cambio de contraseña para empleados (no owners)', async () => {
    serviceMocks.getMerchantContext.mockResolvedValue({ ...context, isOwner: false });

    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByTestId('profile-name', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('form', { name: /formulario de cambio de contraseña/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra un error de validación cuando las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('profile-name', undefined, { timeout: 5000 });

    const newPasswordInput = document.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'otraClave');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    expect(await screen.findByTestId('password-feedback')).toHaveTextContent(
      /no coinciden/i,
    );
    expect(serviceMocks.updateAuthPassword).not.toHaveBeenCalled();
  });

  it('actualiza la contraseña correctamente y muestra feedback positivo', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('profile-name', undefined, { timeout: 5000 });

    const newPasswordInput = document.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(serviceMocks.updateAuthPassword).toHaveBeenCalledWith('password123');
    });
    expect(await screen.findByTestId('password-feedback')).toHaveTextContent(
      /actualizada correctamente/i,
    );
  });

  it('muestra el error devuelto por el servicio al cambiar la contraseña', async () => {
    serviceMocks.updateAuthPassword.mockRejectedValue(
      new Error('Error al actualizar la contraseña: weak password'),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('profile-name', undefined, { timeout: 5000 });

    const newPasswordInput = document.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    expect(await screen.findByTestId('password-feedback')).toHaveTextContent(
      /weak password/i,
    );
  });

  it('cierra la sesión al pulsar el botón y navega a /login', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    authMocks.useAuth.mockReturnValue({
      user: { id: 'owner-1', email: 'owner@pizzeria.com' },
      profile: { id: 'owner-1', email: 'owner@pizzeria.com', full_name: 'María', role: 'merchant_owner' },
      signOut,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('profile-name', undefined, { timeout: 5000 });

    await user.click(screen.getByTestId('merchant-logout'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });

  it('muestra un error de carga cuando getMerchantContext falla', async () => {
    serviceMocks.getMerchantContext.mockRejectedValue(
      new Error('Error al cargar el comercio: rls denied'),
    );

    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /rls denied/i,
    );
  });

  it('muestra un mensaje cuando no hay comercio asociado', async () => {
    serviceMocks.getMerchantContext.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/no se encontró un comercio/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('no muestra métricas, analíticas ni gestión de empleados (esas viven en /admin/dashboard)', async () => {
    render(
      <MemoryRouter>
        <MerchantProfilePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('profile-name', undefined, { timeout: 5000 });

    expect(screen.queryByTestId('merchant-metrics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('analytics-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('staff-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('staff-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-add-employee')).not.toBeInTheDocument();
  });
});
