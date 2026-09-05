import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useUpdateProfile } from './useUpdateProfile';

const mockUpdate = vi.fn();

vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => mockUpdate()),
          })),
        })),
      })),
    })),
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
    mockUpdate.mockResolvedValue({ data: null, error: { message: 'fail' } });
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
  });
});
