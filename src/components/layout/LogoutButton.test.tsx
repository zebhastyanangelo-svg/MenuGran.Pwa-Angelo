import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { LogoutButton } from './LogoutButton';

const signOutMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signOut: signOutMock }),
}));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route
          path="*"
          element={
            <div>
              <LogoutButton />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LogoutButton', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el botón con la etiqueta y el icono LogOut', () => {
    renderAt('/admin');

    const button = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('invoca signOut al hacer clic y navega a /login', async () => {
    signOutMock.mockResolvedValue(undefined);
    renderAt('/admin');

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(signOutMock).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('navega a /login incluso si signOut falla', async () => {
    signOutMock.mockRejectedValue(new Error('network error'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderAt('/admin');

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(signOutMock).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    consoleError.mockRestore();
  });

  it('deshabilita el botón mientras signOut está en curso', async () => {
    let resolveSignOut: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolveSignOut = resolve;
    });
    signOutMock.mockReturnValue(pendingPromise);
    renderAt('/admin');

    const button = screen.getByRole('button', { name: /cerrar sesión/i });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(signOutMock).toHaveBeenCalledOnce();

    resolveSignOut!();
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
