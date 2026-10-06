import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceModeGate } from './ServiceModeGate';
import { SERVICE_MODE_KEY, readServiceMode } from '../../utils/serviceMode';
import { useAuth } from '../../hooks/useAuth';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

function setAuth(user: unknown, profile: unknown, isLoading = false): void {
  vi.mocked(useAuth).mockReturnValue({
    user,
    profile,
    isLoading,
    signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    signOut: vi.fn(),
  } as never);
}

const customerProfile = {
  id: 'user-1',
  email: 'cliente@menugram.com',
  full_name: 'Ana García',
  avatar_url: null,
  role: 'customer',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function renderGate() {
  return render(
    <MemoryRouter>
      <ServiceModeGate />
    </MemoryRouter>,
  );
}

describe('ServiceModeGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('pregunta la modalidad al abrir la app sin modalidad guardada', () => {
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();

    expect(screen.getByTestId('service-mode-chooser')).toBeInTheDocument();
  });

  it('vuelve a preguntar aunque ya haya una modalidad guardada de la sesión anterior', () => {
    localStorage.setItem(SERVICE_MODE_KEY, 'delivery');
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();

    expect(screen.getByTestId('service-mode-chooser')).toBeInTheDocument();
  });

  it('no muestra nada mientras la sesión está cargando', () => {
    setAuth(null, null, true);

    renderGate();

    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();
  });

  it('no muestra nada para usuarios sin sesión', () => {
    setAuth(null, null);

    renderGate();

    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();
  });

  it('no muestra nada para roles distintos de customer', () => {
    setAuth({ id: 'admin-1' }, { ...customerProfile, id: 'admin-1', role: 'superadmin' });

    renderGate();

    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();
  });

  it('guarda la modalidad elegida y cierra el selector', () => {
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();

    fireEvent.click(screen.getByTestId('service-mode-in-store'));

    expect(readServiceMode()).toBe('in_store');
    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();
  });

  it('no vuelve a preguntar dentro de la misma sesión tras elegir', () => {
    setAuth({ id: 'user-1' }, customerProfile);

    const { rerender } = renderGate();
    fireEvent.click(screen.getByTestId('service-mode-delivery'));
    rerender(
      <MemoryRouter>
        <ServiceModeGate />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();
  });
});