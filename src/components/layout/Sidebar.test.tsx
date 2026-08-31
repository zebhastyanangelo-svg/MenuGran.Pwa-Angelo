import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ProfileRow } from '../../types/database';

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

  it('renderiza la navegación de cliente y oculta el Panel', () => {
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

  it('muestra la navegación de comercio para merchant_owner', () => {
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
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /platos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
  });

  it('no muestra el botón de Cerrar Sesión dentro del sidebar', () => {
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
      screen.queryByRole('button', { name: /cerrar sesión/i }),
    ).not.toBeInTheDocument();
  });
});
