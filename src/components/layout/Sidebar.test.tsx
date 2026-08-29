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

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renderiza la marca MenuGram', () => {
    useAuthMock.mockReturnValue({ profile: { role: 'customer' } });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('MenuGram')).toBeInTheDocument();
  });

  it('renderiza la navegación de cliente (Inicio, Carrito, Perfil) y oculta el Panel', () => {
    useAuthMock.mockReturnValue({ profile: { role: 'customer' } });
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
    useAuthMock.mockReturnValue({ profile: { role: 'merchant_owner' } });
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
    useAuthMock.mockReturnValue({ profile: { role: 'merchant_staff' } });
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
});
