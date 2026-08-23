import { describe, it, expect, vi } from 'vitest';
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
  it('renderiza la navegación de cliente (Inicio, Carrito, Perfil)', () => {
    useAuthMock.mockReturnValue({ profile: { role: 'customer' } });
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
    useAuthMock.mockReturnValue({ profile: { role: 'merchant_owner' } });
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
    useAuthMock.mockReturnValue({ profile: { role: 'customer' } });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveClass('text-brand-red');
  });

  it('usa el atributo de navegación principal', () => {
    useAuthMock.mockReturnValue({ profile: { role: 'customer' } });
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
  });
});
