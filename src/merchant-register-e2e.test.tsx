import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileRow } from './types/database';
import { AuthProvider } from './context/AuthContext';
import { AuthForm } from './components/auth/AuthForm';

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi
    .fn()
    .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
}));

vi.mock('./services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
      signInWithOAuth: authMocks.signInWithOAuth,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      resend: authMocks.resend,
      signOut: authMocks.signOut,
    },
    from: authMocks.from,
  },
  TABLE_NAMES: { profiles: 'profiles' },
}));

vi.mock('./services/merchantService', () => ({
  createMerchant: vi.fn(),
  updateMerchant: vi.fn(),
}));

vi.mock('./services/imgbb', () => ({
  uploadToImgBB: vi.fn().mockResolvedValue('https://example.com/uploaded-image'),
}));

function buildProfile(id: string, role: ProfileRow['role']): ProfileRow {
  return {
    id,
    email: `${id}@menugram.com`,
    full_name: null,
    avatar_url: null,
    role,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function mockProfileQuery(result: {
  data: ProfileRow | null;
  error: unknown;
}): void {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  authMocks.from.mockReturnValue({ select });
}

describe('Merchant Owner Registration E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render merchant_owner registration fields when Comercio tab is selected', async () => {
    mockProfileQuery({ data: buildProfile('merchant-user-123', 'merchant_owner'), error: null });

    render(
      <MemoryRouter>
        <AuthProvider>
          <AuthForm defaultTab="register" />
        </AuthProvider>
      </MemoryRouter>,
    );

    // Select the "Comercio" (merchant_owner) tab
    const commerceTab = screen.getByRole('button', { name: /Comercio/i });
    await userEvent.click(commerceTab);

    // Merchant-specific fields must be present
    expect(screen.getByLabelText('RIF')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
    expect(screen.getByLabelText('Dirección')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono WhatsApp')).toBeInTheDocument();

    // Shared fields are present in both views
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument();
    // Customer-only fields must NOT be present in the merchant view
    expect(screen.queryByLabelText('C.I. (Cédula de Identidad)')).not.toBeInTheDocument();

    console.log('✅ Merchant registration fields rendered correctly');
  });
});
