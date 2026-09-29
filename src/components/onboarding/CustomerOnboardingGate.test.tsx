import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerOnboardingGate } from './CustomerOnboardingGate';
import { ONBOARDING_COMPLETED_KEY, isOnboardingCompleted, markOnboardingCompleted } from './onboardingStorage';
import { useAuth } from '../../hooks/useAuth';

const fromMock = vi.fn();

// Mock de localStorage (el entorno de tests no expone uno real).
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    categories: 'categories',
    products: 'products',
    orders: 'orders',
    deliveries: 'deliveries',
    userPushSubscriptions: 'user_push_subscriptions',
  },
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

const updateMock = vi.fn().mockResolvedValue({ error: null });
fromMock.mockReturnValue({
  update: (...args: unknown[]) => updateMock(...args),
  eq: vi.fn().mockResolvedValue({ error: null }),
});

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

describe('CustomerOnboardingGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('muestra el tutorial para un cliente que nunca lo ha visto', () => {
    setAuth({ id: 'user-1' }, customerProfile);

    render(<CustomerOnboardingGate />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Explora los comercios cercanos/i })).toBeInTheDocument();
  });

  it('no muestra el tutorial mientras la sesión está cargando', () => {
    setAuth(null, null, true);

    render(<CustomerOnboardingGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no muestra el tutorial para usuarios sin sesión', () => {
    setAuth(null, null);

    render(<CustomerOnboardingGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no muestra el tutorial para roles distintos de customer', () => {
    setAuth({ id: 'admin-1' }, { ...customerProfile, id: 'admin-1', role: 'superadmin' });

    render(<CustomerOnboardingGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no muestra el tutorial si ya está marcado en localStorage', () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setAuth({ id: 'user-1' }, customerProfile);

    render(<CustomerOnboardingGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no muestra el tutorial si el perfil de Supabase ya lo tiene completado', () => {
    setAuth({ id: 'user-1' }, { ...customerProfile, onboarding_completed: true });

    render(<CustomerOnboardingGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al completar guarda la marca en localStorage y en el perfil', async () => {
    setAuth({ id: 'user-1' }, customerProfile);

    render(<CustomerOnboardingGate />);

    fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));

    expect(isOnboardingCompleted()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_COMPLETED_KEY)).toBe('true');

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('profiles');
      expect(updateMock).toHaveBeenCalledWith({ onboarding_completed: true });
    });
  });

  it('al completar con "Entendido" también guarda la marca', async () => {
    setAuth({ id: 'user-1' }, customerProfile);

    render(<CustomerOnboardingGate />);

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole('button', { name: /Entendido, ¡Comenzar a pedir!/i }));

    expect(isOnboardingCompleted()).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('helpers de onboarding', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('markOnboardingCompleted e isOnboardingCompleted redondean el ciclo', () => {
    expect(isOnboardingCompleted()).toBe(false);
    markOnboardingCompleted();
    expect(isOnboardingCompleted()).toBe(true);
  });
});
