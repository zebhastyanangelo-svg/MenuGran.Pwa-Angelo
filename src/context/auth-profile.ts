import { supabase, TABLE_NAMES } from '../services/supabase';
import type { ProfileRow } from '../types/database';
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
