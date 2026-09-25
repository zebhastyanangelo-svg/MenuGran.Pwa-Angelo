import { supabase } from './supabase';

export interface AuthenticatedFunctionHeaders extends Record<string, string> {
  Authorization: string;
}

export async function getAuthenticatedFunctionHeaders(): Promise<AuthenticatedFunctionHeaders> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error !== null || accessToken === undefined || accessToken === '') {
      throw new Error('missing-session');
    }
    return { Authorization: `Bearer ${accessToken}` };
  } catch {
    throw new Error('Tu sesión no está disponible. Inicia sesión nuevamente.');
  }
}

export async function readFunctionError(
  response: Response | undefined,
): Promise<string | null> {
  if (response === undefined) return null;
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === 'string') return body.error;
  } catch {
    return null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
