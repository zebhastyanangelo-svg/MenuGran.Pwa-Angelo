import { supabase, TABLE_NAMES } from '../services/supabase';
import type { ProfileRow, UserRole } from '../types/database';
import type { ProfileQueryResult } from './auth-context-core';

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const result = (await supabase
    .from(TABLE_NAMES.profiles)
    .select('*')
    .eq('id', userId)
    .single()) as unknown as ProfileQueryResult;

  if (result.error !== null) {
    console.error('Error al consultar el perfil del usuario', result.error);
    return null;
  }

  return result.data;
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
  const profile = await fetchProfile(data.user.id);
  return profile?.role ?? null;
}
