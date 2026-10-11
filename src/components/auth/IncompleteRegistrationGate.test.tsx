import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '../../types/database';
import { IncompleteRegistrationGate } from './IncompleteRegistrationGate';

const mockUseAuth = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function buildProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-1',
    email: 'nuevo@gmail.com',
    full_name: 'Nuevo Usuario',
    avatar_url: null,
    role: 'customer',
    registration_completed: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildUser(): User {
  return {
    id: 'user-1',
    email: 'nuevo@gmail.com',
    user_metadata: { full_name: 'Nuevo Usuario' },
  } as unknown as User;
}

function renderGate(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <IncompleteRegistrationGate />
              <div data-testid="home">Home</div>
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <IncompleteRegistrationGate />
              <div data-testid="register">Registro</div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncompleteRegistrationGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirige a /register con prefill cuando el cliente no completó el registro', () => {
    mockUseAuth.mockReturnValue({
      user: buildUser(),
      profile: buildProfile({ registration_completed: false }),
      isLoading: false,
    });

    renderGate('/');

    expect(screen.getByTestId('register')).toBeInTheDocument();
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it('no redirige mientras la sesión está cargando', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isLoading: true });

    renderGate('/');

    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('no redirige a un cliente que ya completó el registro', () => {
    mockUseAuth.mockReturnValue({
      user: buildUser(),
      profile: buildProfile({ registration_completed: true }),
      isLoading: false,
    });

    renderGate('/');

    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('no redirige cuando no hay sesión', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, isLoading: false });

    renderGate('/');

    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('no interviene en la propia vista de registro', () => {
    mockUseAuth.mockReturnValue({
      user: buildUser(),
      profile: buildProfile({ registration_completed: false }),
      isLoading: false,
    });

    renderGate('/register');

    expect(screen.getByTestId('register')).toBeInTheDocument();
  });
});
