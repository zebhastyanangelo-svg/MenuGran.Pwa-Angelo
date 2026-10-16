import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthenticatedFunctionHeaders,
  readFunctionError,
} from './edgeFunctions';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
    },
  },
}));

describe('edgeFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve un header Bearer con la sesión actual', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
      error: null,
    });

    await expect(getAuthenticatedFunctionHeaders()).resolves.toEqual({
      Authorization: 'Bearer access-token',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('falla de forma explícita cuando no hay token', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(getAuthenticatedFunctionHeaders()).rejects.toThrow(
      'Tu sesión no está disponible. Inicia sesión nuevamente.',
    );
  });

  it('renueva el token que está por expirar antes de enviarlo', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token',
          expires_at: Math.floor(Date.now() / 1000) + 5,
        },
      },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'renewed-token' } },
      error: null,
    });

    await expect(getAuthenticatedFunctionHeaders()).resolves.toEqual({
      Authorization: 'Bearer renewed-token',
    });
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('conserva el token vigente si la renovación falla', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'still-valid-token',
          expires_at: Math.floor(Date.now() / 1000) + 5,
        },
      },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: {} });

    await expect(getAuthenticatedFunctionHeaders()).resolves.toEqual({
      Authorization: 'Bearer still-valid-token',
    });
  });

  it('lee el mensaje JSON de una respuesta fallida', async () => {
    const response = {
      json: vi.fn().mockResolvedValue({ error: 'Sesión inválida o expirada.' }),
    } as unknown as Response;

    await expect(readFunctionError(response)).resolves.toBe(
      'Sesión inválida o expirada.',
    );
  });

  it('devuelve null cuando la respuesta no contiene un error JSON', async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new Error('not-json')),
    } as unknown as Response;

    await expect(readFunctionError(response)).resolves.toBeNull();
  });
});
