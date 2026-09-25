import { supabase, TABLE_NAMES } from '../services/supabase';
import type { ProfileRow, UserRole } from '../types/database';
import type { ProfileQueryResult } from './auth-context-core';

async function queryProfileByField(
  field: 'id' | 'email',
  value: string,
): Promise<ProfileRow | null> {
  const result = (await supabase
    .from(TABLE_NAMES.profiles)
    .select('*')
    .eq(field, value)
    .single()) as unknown as ProfileQueryResult;

  if (result.error !== null) {
    console.error('Error al consultar el perfil del usuario', result.error);
    return null;
  }

  return result.data;
}

/**
 * Perfil por id de Auth. Si la cuenta fue vinculada por email (p. ej. Google
 * OAuth sobre un correo pre-registrado por administración con otro auth.uid),
 * usa el email como respaldo para conservar el rol corporativo asignado.
 */
export async function fetchProfile(
  userId: string,
  email: string | null = null,
): Promise<ProfileRow | null> {
  const byId = await queryProfileByField('id', userId);
  if (byId !== null || email === null || email === '') {
    return byId;
  }
  return queryProfileByField('email', email);
}

/**
 * Devuelve el rol del perfil de la sesión activa (o null si no hay sesión).
 * Se usa justo después del login para la redirección inteligente.
 */
export async function fetchCurrentSessionRole(): Promise<UserRole | null> {
  const { data } = await supabase.auth.getUser();
  if (data.user === null) {
    return null;
  }
  const profile = await fetchProfile(data.user.id, data.user.email ?? null);
  return profile?.role ?? null;
}
