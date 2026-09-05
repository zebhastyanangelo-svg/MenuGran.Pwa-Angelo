import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuperAdminUsersPage } from './SuperAdminUsersPage';

vi.mock('../../hooks/useSuperAdminUsers', () => ({
  useSuperAdminUsers: vi.fn(),
}));

import { useSuperAdminUsers } from '../../hooks/useSuperAdminUsers';

const mockHook = vi.mocked(useSuperAdminUsers);

const sampleUsers = [
  {
    id: 'u1',
    full_name: 'Carlos Pérez',
    email: 'carlos@test.com',
    ci: '12345678',
    phone: '+584121234567',
    role: 'merchant_owner' as const,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'u2',
    full_name: null,
    email: 'anonym@test.com',
    ci: null,
    phone: null,
    role: 'customer' as const,
    created_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'u3',
    full_name: 'María González',
    email: 'maria@test.com',
    ci: '87654321',
    phone: '+584129876543',
    role: 'driver' as const,
    created_at: '2026-06-10T08:00:00Z',
  },
];

function baseReturn(overrides: Partial<ReturnType<typeof useSuperAdminUsers>> = {}) {
  return {
    users: sampleUsers,
    isLoading: false,
    error: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    ...overrides,
  };
}

describe('SuperAdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el título y la tabla con todos los usuarios', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminUsersPage />);

    expect(screen.getByRole('heading', { name: /Gestión de Usuarios/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('user-row')).toHaveLength(3);
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument();
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('+584121234567')).toBeInTheDocument();
  });

  it('muestra "Sin nombre" y guiones para campos vacíos', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminUsersPage />);

    expect(screen.getByText('Sin nombre')).toBeInTheDocument();
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('muestra estado de carga', () => {
    mockHook.mockReturnValue(baseReturn({ isLoading: true, users: [] }));

    render(<SuperAdminUsersPage />);

    expect(screen.getByText(/Cargando usuarios/i)).toBeInTheDocument();
  });

  it('muestra error cuando falla la carga', () => {
    mockHook.mockReturnValue(baseReturn({ error: 'Permission denied', users: [] }));

    render(<SuperAdminUsersPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Permission denied');
  });

  it('muestra mensaje cuando no hay usuarios', () => {
    mockHook.mockReturnValue(baseReturn({ users: [] }));

    render(<SuperAdminUsersPage />);

    expect(screen.getByText(/Aún no hay usuarios registrados/)).toBeInTheDocument();
  });

  it('muestra mensaje de búsqueda sin resultados', () => {
    mockHook.mockReturnValue(
      baseReturn({
        users: [],
        searchQuery: 'xyz123',
        setSearchQuery: vi.fn(),
      }),
    );

    render(<SuperAdminUsersPage />);

    expect(
      screen.getByText(/No se encontraron usuarios que coincidan con la búsqueda/),
    ).toBeInTheDocument();
  });

  it('llama a setSearchQuery al escribir en el campo de búsqueda', () => {
    const mockSetSearch = vi.fn();
    mockHook.mockReturnValue(baseReturn({ setSearchQuery: mockSetSearch }));

    render(<SuperAdminUsersPage />);

    const input = screen.getByRole('searchbox', { name: /Buscar usuarios/i });
    fireEvent.change(input, { target: { value: 'carlos' } });

    expect(mockSetSearch).toHaveBeenCalledWith('carlos');
  });

  it('muestra el contador de usuarios encontrados', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminUsersPage />);

    expect(screen.getByText('3 usuarios encontrados')).toBeInTheDocument();
  });

  it('renderiza badges de rol correctamente', () => {
    mockHook.mockReturnValue(baseReturn());

    render(<SuperAdminUsersPage />);

    expect(screen.getByText('Comercio')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Repartidor')).toBeInTheDocument();
  });
});
