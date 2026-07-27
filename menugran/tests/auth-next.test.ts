import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/crypto', () => ({
  verifyPin: vi.fn(),
  hashPin: vi.fn(),
  maskPhone: vi.fn(),
}));

describe('auth-next', () => {
  it('exports a callable `auth` function', async () => {
    const mod = await import('@/lib/auth-next');
    expect(typeof mod.auth).toBe('function');
  });
});
