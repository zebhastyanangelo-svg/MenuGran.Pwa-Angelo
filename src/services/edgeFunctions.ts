import { supabase } from './supabase';

/**
 * Ventana de seguridad antes de la expiración real del access token: un JWT que
 * viaja al borde del expiry puede ser rechazado por la Edge Function con 401
 * aunque el SDK local todavía lo considere vigente.
 */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

const NO_SESSION_MESSAGE = 'Tu sesión no está disponible. Inicia sesión nuevamente.';

export interface AuthenticatedFunctionHeaders extends Record<string, string> {
  Authorization: string;
}

/**
 * Fallo recuperable: el cliente no tiene una sesión utilizable *todavía*. Se
 * distingue de un error definitivo para que el llamador pueda renovar la sesión
 * y reintentar una vez antes de mostrar el mensaje al usuario.
 */
export class MissingSessionError extends Error {
  constructor() {
    super(NO_SESSION_MESSAGE);
    this.name = 'MissingSessionError';
  }
}

/**
 * Resultado de una invocación a Edge Function. El mensaje del servidor se
 * separa del error del cliente porque cada pantalla lo redacta con su propio
 * contexto ("Error al crear el empleado: …").
 */
export type FunctionInvokeResult<TResponse> =
  | { ok: true; data: TResponse | null }
  | { ok: false; serverMessage: string | null; status: number; cause: string };

function isExpiringSoon(expiresAt: number | undefined): boolean {
  if (expiresAt === undefined) return false;
  return expiresAt * 1000 - Date.now() < TOKEN_EXPIRY_MARGIN_MS;
}

/** Access token vigente, renovándolo antes de que expire en vuelo. */
async function resolveAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (error !== null || session === null) return null;
    if (!isExpiringSoon(session.expires_at)) return session.access_token;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session?.access_token ?? session.access_token;
  } catch {
    return null;
  }
}

export async function getAuthenticatedFunctionHeaders(): Promise<AuthenticatedFunctionHeaders> {
  const accessToken = await resolveAccessToken();
  if (accessToken === null) throw new MissingSessionError();
  return { Authorization: `Bearer ${accessToken}` };
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

async function invokeWithSession<TResponse>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<FunctionInvokeResult<TResponse>> {
  try {
    const headers = await getAuthenticatedFunctionHeaders();
    const { data, error, response } = await supabase.functions.invoke<TResponse>(
      functionName,
      { headers, body },
    );
    if (error === null) return { ok: true, data };
    return {
      ok: false,
      serverMessage: await readFunctionError(response),
      status: response?.status ?? 0,
      cause: error.message,
    };
  } catch (caught) {
    // Sin sesión no hay nada que reintentar: el error va directo a la UI.
    if (caught instanceof MissingSessionError) throw caught;
    return {
      ok: false,
      serverMessage: null,
      status: 0,
      cause: caught instanceof Error ? caught.message : String(caught),
    };
  }
}

async function renewSession(): Promise<void> {
  try {
    await supabase.auth.refreshSession();
  } catch {
    // Se conserva el token actual: el reintento decidirá si es suficiente.
  }
}

/**
 * Invoca una Edge Function autenticada con el token de sesión vigente.
 *
 * Si el servidor responde 401 (token expirado o rechazado) se renueva la
 * sesión y se reintenta **una sola vez**. Sin ese reintento el comercio se
 * queda viendo "Sesión inválida o expirada" aunque su refresh token siga
 * siendo válido, que es la causa del 401 al crear empleados.
 */
export async function invokeAuthenticatedFunction<TResponse>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<FunctionInvokeResult<TResponse>> {
  const firstAttempt = await invokeWithSession<TResponse>(functionName, body);
  if (firstAttempt.ok || firstAttempt.status !== 401) return firstAttempt;

  await renewSession();
  return invokeWithSession<TResponse>(functionName, body);
}