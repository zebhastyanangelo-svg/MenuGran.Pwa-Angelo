import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileRow } from '../../types/database';
import { CartFab } from './CartFab';

const authState: { profile: ProfileRow | null } = { profile: null };

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../../hooks/useCart', () => ({
  useCart: () => ({ totalItems: 3 }),
}));

vi.mock('./CartDrawer', () => ({
  CartDrawer: () => <div data-testid="cart-drawer" />,
}));

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

function renderFab(): void {
  render(
    <MemoryRouter initialEntries={['/marketplace']}>
      <CartFab />
    </MemoryRouter>,
  );
}

describe('CartFab', () => {
  beforeEach(() => {
    authState.profile = null;
  });

  it('muestra el botón flotante del carrito para clientes', () => {
    authState.profile = buildProfile('customer');
    renderFab();

    expect(
      screen.getByRole('button', { name: /abrir carrito/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('oculta el botón flotante del carrito para el superadmin', () => {
    authState.profile = buildProfile('superadmin');
    renderFab();

    expect(
      screen.queryByRole('button', { name: /abrir carrito/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('cart-drawer')).not.toBeInTheDocument();
  });
});
