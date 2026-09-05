import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IncompleteProfileBanner, isProfileIncomplete } from './IncompleteProfileBanner';
import type { UserRole } from '../types/database';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const { useAuth } = await import('../hooks/useAuth');

function mockProfile(
  role: UserRole,
  overrides: Partial<{ ci: string | null; phone: string | null }> = {},
) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', email: 'a@b.com' },
    profile: {
      id: 'u1',
      email: 'a@b.com',
      full_name: 'Test',
      avatar_url: null,
      role,
      ci: overrides.ci ?? null,
      phone: overrides.phone ?? null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    isLoading: false,
  } as never);
}

describe('isProfileIncomplete', () => {
  it('retorna true cuando phone falta', () => {
    expect(isProfileIncomplete({ phone: null, ci: 'V-12345' })).toBe(true);
  });

  it('retorna true cuando ci falta', () => {
    expect(isProfileIncomplete({ phone: '+58412', ci: null })).toBe(true);
  });

  it('retorna true cuando ambos faltan', () => {
    expect(isProfileIncomplete({ phone: null, ci: null })).toBe(true);
  });

  it('retorna false cuando ambos están presentes', () => {
    expect(isProfileIncomplete({ phone: '+58412', ci: 'V-12345' })).toBe(false);
  });

  it('retorna false cuando profile es null', () => {
    expect(isProfileIncomplete(null)).toBe(false);
  });
});

describe('IncompleteProfileBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('se renderiza cuando el perfil es customer y tiene datos faltantes', () => {
    mockProfile('customer');

    render(
      <MemoryRouter>
        <IncompleteProfileBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Tu perfil está incompleto/i)).toBeInTheDocument();
    expect(screen.getByText(/Completar perfil/i)).toBeInTheDocument();
  });

  it('no se renderiza cuando el perfil está completo', () => {
    mockProfile('customer', { ci: 'V-12345', phone: '+58412123456' });

    const { container } = render(
      <MemoryRouter>
        <IncompleteProfileBanner />
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('no se renderiza cuando profile es null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
    } as never);

    const { container } = render(
      <MemoryRouter>
        <IncompleteProfileBanner />
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe('');
  });

  const nonCustomerRoles: UserRole[] = ['superadmin', 'merchant_owner', 'merchant_staff', 'driver'];

  it.each(nonCustomerRoles)(
    'no se renderiza cuando el rol es %s aunque le falten datos',
    (role) => {
      mockProfile(role);

      const { container } = render(
        <MemoryRouter>
          <IncompleteProfileBanner />
        </MemoryRouter>,
      );

      expect(container.innerHTML).toBe('');
    },
  );
});
