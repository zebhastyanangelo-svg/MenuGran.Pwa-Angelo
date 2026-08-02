import { describe, it, expect } from 'vitest';
import { authOptions } from '@/lib/auth-next';

describe('authOptions (Edge-safe config)', () => {
  it('uses jwt session strategy', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
  });

  it('has a credentials provider', () => {
    expect(authOptions.providers.length).toBeGreaterThan(0);
    expect(authOptions.providers[0].name).toBe('Credentials');
  });

  it('points signIn to /login', () => {
    expect(authOptions.pages?.signIn).toBe('/login');
  });

  it('jwt callback exists', () => {
    expect(typeof authOptions.callbacks?.jwt).toBe('function');
  });

  it('session callback exists', () => {
    expect(typeof authOptions.callbacks?.session).toBe('function');
  });
});
