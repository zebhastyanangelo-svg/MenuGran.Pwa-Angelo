import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceModeGate } from './ServiceModeGate';
import {
  SERVICE_MODE_KEY,
  SERVICE_MODE_SESSION_KEY,
  clearServiceMode,
  isServiceModeSessionResolved,
  readServiceMode,
} from '../../utils/serviceMode';
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
    sessionStorage.clear();
    // La resolución de sesión se guarda en `sessionStorage` y se refleja en el
    // módulo: hay que resetearla para que cada prueba arranque como una
    // pestaña nueva.
    clearServiceMode();
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

  it('marca la sesión como resuelta al elegir', () => {
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();
    fireEvent.click(screen.getByTestId('service-mode-in-store'));

    expect(isServiceModeSessionResolved()).toBe(true);
  });

  it('vuelve a mostrar el selector si se borra el modo a mitad de sesión', () => {
    // Simula "cambiar modalidad" desde el perfil: el modo se borra y el
    // cliente debe volver a pasar por la elección.
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();
    fireEvent.click(screen.getByTestId('service-mode-delivery'));
    expect(screen.queryByTestId('service-mode-chooser')).not.toBeInTheDocument();

    act(() => {
      clearServiceMode();
    });

    expect(screen.getByTestId('service-mode-chooser')).toBeInTheDocument();
  });

  it('guarda la elección en sessionStorage para sobrevivir a salir y volver de la PWA', async () => {
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();
    fireEvent.click(screen.getByTestId('service-mode-delivery'));

    // Al volver de la galería la PWA puede recargarse: el módulo se recrea y
    // lee la bandera de `sessionStorage` en lugar de la memoria de JS.
    expect(sessionStorage.getItem(SERVICE_MODE_SESSION_KEY)).toBe('true');
    vi.resetModules();
    const reloaded = await import('../../utils/serviceMode');

    expect(reloaded.isServiceModeSessionResolved()).toBe(true);
  });

  it('vuelve a preguntar en una pestaña nueva (sessionStorage se limpia al cerrar)', async () => {
    setAuth({ id: 'user-1' }, customerProfile);

    renderGate();
    fireEvent.click(screen.getByTestId('service-mode-in-store'));

    // Cerrar la pestaña borra `sessionStorage`; con la memoria del módulo
    // recreada, la siguiente apertura vuelve a preguntar la modalidad.
    sessionStorage.clear();
    vi.resetModules();
    const reloaded = await import('../../utils/serviceMode');

    expect(reloaded.isServiceModeSessionResolved()).toBe(false);
  });
});