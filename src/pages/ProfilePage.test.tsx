import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfile } from '../hooks/useUpdateProfile';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../hooks/useAuth');
vi.mock('../hooks/useUpdateProfile', () => ({
  useUpdateProfile: vi.fn(() => ({
    updateProfile: vi.fn(),
    deleteAccount: vi.fn(),
    isSaving: false,
    isDeleting: false,
    error: null,
  })),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useParams: () => ({}),
  };
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra la información del cliente y el botón de cerrar sesión', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        user_metadata: { full_name: 'Ana García' },
      },
      profile: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        full_name: 'Ana García',
        ci: 'V-12345678',
        phone: '+584121234567',
        avatar_url: null,
        role: 'customer',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: mockSignOut,
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Perfil del cliente')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ana García/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('cliente@menugram.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('V-12345678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+584121234567')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('invoca signOut al hacer click en cerrar sesión', async () => {
    mockSignOut.mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        user_metadata: { full_name: 'Ana García' },
      },
      profile: null,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: mockSignOut,
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('muestra campos vacíos cuando el perfil no tiene ci ni phone', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-2',
        email: 'oauth@test.com',
        user_metadata: { full_name: 'Carlos López' },
      },
      profile: {
        id: 'user-2',
        email: 'oauth@test.com',
        full_name: 'Carlos López',
        avatar_url: null,
        role: 'customer',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: vi.fn(),
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue('oauth@test.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej. V-12345678')).toHaveValue('');
    expect(screen.getByPlaceholderText('Ej. +584121234567')).toHaveValue('');
  });

  it('muestra la zona de peligro con botón para eliminar cuenta', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        user_metadata: { full_name: 'Ana García' },
      },
      profile: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        full_name: 'Ana García',
        ci: 'V-12345678',
        phone: '+584121234567',
        avatar_url: null,
        role: 'customer',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: mockSignOut,
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Zona de peligro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar mi cuenta/i })).toBeInTheDocument();
  });

  it('abre el modal de confirmación al pulsar eliminar mi cuenta', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        user_metadata: { full_name: 'Ana García' },
      },
      profile: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        full_name: 'Ana García',
        ci: 'V-12345678',
        phone: '+584121234567',
        avatar_url: null,
        role: 'customer',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: mockSignOut,
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /eliminar mi cuenta/i }));
    expect(screen.getByRole('heading', { name: /confirmar eliminación/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ELIMINAR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar definitivamente/i })).toBeDisabled();
  });

  it('habilita el botón de eliminar definitivamente solo al escribir ELIMINAR', async () => {
    const deleteAccountMock = vi.fn().mockResolvedValue(undefined);
    mockNavigate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        user_metadata: { full_name: 'Ana García' },
      },
      profile: {
        id: 'user-1',
        email: 'cliente@menugram.com',
        full_name: 'Ana García',
        ci: 'V-12345678',
        phone: '+584121234567',
        avatar_url: null,
        role: 'customer',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      resendConfirmationEmail: vi.fn(),
      signOut: mockSignOut,
    } as never);

    vi.mocked(useUpdateProfile).mockReturnValue({
      updateProfile: vi.fn(),
      deleteAccount: deleteAccountMock,
      isSaving: false,
      isDeleting: false,
      error: null,
    } as never);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /eliminar mi cuenta/i }));
    const confirmInput = screen.getByPlaceholderText('ELIMINAR');
    await userEvent.type(confirmInput, 'ELIMINAR');
    expect(screen.getByRole('button', { name: /eliminar definitivamente/i })).not.toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /eliminar definitivamente/i }));
    expect(deleteAccountMock).toHaveBeenCalledWith('user-1');
    // after deletion should navigate to home (navigation tested via integration)
  });
});
