import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useUpdateProfile } from './useUpdateProfile';

const mockSelectSingle = vi.fn();
const mockUpdateSingle = vi.fn();
const authMocks = vi.hoisted(() => ({ reloadProfile: vi.fn() }));

vi.mock('./useAuth', () => ({
  useAuth: () => ({ reloadProfile: authMocks.reloadProfile }),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: mockSelectSingle,
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockUpdateSingle,
              })),
            })),
          })),
        };
      }
      return {};
    }),
  },
  TABLE_NAMES: { profiles: 'profiles' },
}));

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna isSaving false inicialmente', () => {
    const { result } = renderHook(() => useUpdateProfile());
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('retorna error cuando la actualización falla', async () => {
    // No duplicate CI
    mockSelectSingle.mockResolvedValue({ data: null, error: null });
    // Update fails
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const { result } = renderHook(() => useUpdateProfile());

    await act(async () => {
      try {
        await result.current.updateProfile('user-1', { ci: 'V-12345' });
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('fail');
      expect(result.current.isSaving).toBe(false);
    });
    expect(authMocks.reloadProfile).not.toHaveBeenCalled();
  });

  it('refresca el perfil del contexto tras guardar exitosamente', async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: null });
    mockUpdateSingle.mockResolvedValue({ data: { id: 'user-1', full_name: 'Nuevo' }, error: null });

    const { result } = renderHook(() => useUpdateProfile());

    let updatedProfile: unknown = null;
    await act(async () => {
      updatedProfile = await result.current.updateProfile('user-1', { ci: 'V-12345' });
    });

    expect(updatedProfile).toEqual({ id: 'user-1', full_name: 'Nuevo' });
    expect(authMocks.reloadProfile).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });
});
