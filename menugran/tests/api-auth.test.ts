import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

vi.mock('@/lib/auth-next', () => ({
  auth: mockAuth,
}));

import { withAuth } from '@/lib/api-auth';

describe('withAuth', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('returns the session when auth returns a valid user', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'u1', role: 'ADMIN', name: 'X' },
    });
    const result = await withAuth();
    expect(mockAuth).toHaveBeenCalled();
    expect(result).toEqual({ user: { id: 'u1', role: 'ADMIN', name: 'X' } });
  });

  it('returns 401 NextResponse when session is missing', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await withAuth();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 401 when session has no user.id', async () => {
    mockAuth.mockResolvedValueOnce({ user: null });
    const result = await withAuth();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when role does not match requiredRole', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'u1', role: 'CLIENT', name: 'X' },
    });
    const result = await withAuth({ requiredRole: 'ADMIN' });
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns session when role is one of the allowed array', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'u1', role: 'OPERATOR', name: 'X' },
    });
    const result = await withAuth({ requiredRole: ['ADMIN', 'OPERATOR'] });
    expect(result).toEqual({ user: { id: 'u1', role: 'OPERATOR', name: 'X' } });
  });

  it('returns session when single requiredRole matches', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: 'u1', role: 'RIDER', name: 'X' },
    });
    const result = await withAuth({ requiredRole: 'RIDER' });
    expect(result).toEqual({ user: { id: 'u1', role: 'RIDER', name: 'X' } });
  });
});
