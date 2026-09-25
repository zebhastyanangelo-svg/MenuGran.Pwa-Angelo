import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthenticatedFunctionHeaders,
  readFunctionError,
} from './edgeFunctions';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
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
  });

  it('falla de forma explícita cuando no hay token', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(getAuthenticatedFunctionHeaders()).rejects.toThrow(
      'Tu sesión no está disponible. Inicia sesión nuevamente.',
    );
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
