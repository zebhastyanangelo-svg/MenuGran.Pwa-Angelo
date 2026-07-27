import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/crypto', () => ({
  verifyPin: vi.fn().mockResolvedValue(false),
  hashPin: vi.fn(),
  maskPhone: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

describe('auth-next', () => {
  it('exports a callable `auth` function', async () => {
    const mod = await import('@/lib/auth-next');
    expect(typeof mod.auth).toBe('function');
  });

  it('exports a `handlers` bundle with GET and POST', async () => {
    const mod = await import('@/lib/auth-next');
    expect(mod.handlers).toBeDefined();
    expect(typeof mod.handlers.GET).toBe('function');
    expect(typeof mod.handlers.POST).toBe('function');
  });

  it('exports `authOptions` for legacy v4 getServerSession callers', async () => {
    const mod = await import('@/lib/auth-next');
    expect(mod.authOptions).toBeDefined();
    expect(mod.authOptions.providers).toBeInstanceOf(Array);
    expect(mod.authOptions.session).toEqual({ strategy: 'jwt' });
  });

  it('auth() returns null when getServerSession has no session', async () => {
    const mod = await import('@/lib/auth-next');
    const session = await mod.auth();
    expect(session).toBeNull();
  });
});
