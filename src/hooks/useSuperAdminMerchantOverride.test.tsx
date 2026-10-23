import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSuperAdminMerchantOverride } from './useSuperAdminMerchantOverride';

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: authMocks.useAuth,
}));

function mockRole(role: 'superadmin' | 'merchant_owner' | null): void {
  authMocks.useAuth.mockReturnValue({
    profile: role === null ? null : { role },
  });
}

function renderOverrideHookInRouter(path: string) {
  return renderHook(() => useSuperAdminMerchantOverride(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    ),
  });
}

describe('useSuperAdminMerchantOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('no lanza cuando se monta fuera de un <Router> (tests aislados)', () => {
    mockRole('superadmin');

    const { result } = renderHook(() => useSuperAdminMerchantOverride());

    expect(result.current).toEqual({ merchantId: null, isActive: false });
  });

  it('expone el override del superadmin dentro de un <Router>', () => {
    mockRole('superadmin');

    const { result } = renderOverrideHookInRouter('/?merchant_id=m-1');

    expect(result.current).toEqual({ merchantId: 'm-1', isActive: true });
  });

  it('recorta los espacios en blanco del id del query', () => {
    mockRole('superadmin');

    const { result } = renderOverrideHookInRouter('/?merchant_id=%20m-7%20');

    expect(result.current).toEqual({ merchantId: 'm-7', isActive: true });
  });

  it('ignora el override para roles que no son superadmin', () => {
    mockRole('merchant_owner');

    const { result } = renderOverrideHookInRouter('/?merchant_id=m-1');

    expect(result.current).toEqual({ merchantId: null, isActive: false });
  });

  it('fuera de un <Router> lee merchant_id de window.location.search como fallback', () => {
    mockRole('superadmin');
    window.history.replaceState({}, '', '/?merchant_id=m-9');

    const { result } = renderHook(() => useSuperAdminMerchantOverride());

    expect(result.current).toEqual({ merchantId: 'm-9', isActive: true });
  });

  it('ignora el fallback de window.location.search para roles que no son superadmin', () => {
    mockRole('merchant_owner');
    window.history.replaceState({}, '', '/?merchant_id=m-9');

    const { result } = renderHook(() => useSuperAdminMerchantOverride());

    expect(result.current).toEqual({ merchantId: null, isActive: false });
  });
});
