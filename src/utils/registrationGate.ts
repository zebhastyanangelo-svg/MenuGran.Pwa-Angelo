import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '../types/database';

/**
 * Determina si un usuario autenticado aún no completa su registro en
 * MenuGran. Aplica solo a clientes: los roles corporativos (creados por
 * administración o edge functions) siempre se consideran registrados.
 *
 * - Sin sesión → false (no hay nada que completar).
 * - Sesión sin perfil en la base de datos → true (el trigger no llegó a
 *   crearlo o falló; el usuario debe completar el registro).
 * - Perfil de cliente sin `registration_completed` → true (entró por Google
 *   por primera vez y nunca pasó por el formulario).
 */
export function isRegistrationIncomplete(
  profile: ProfileRow | null,
  user: User | null,
): boolean {
  if (user === null) return false;
  if (profile === null) return true;
  if (profile.role !== 'customer') return false;
  return profile.registration_completed === false;
}

/**
 * Construye la query string de `/register` con los datos básicos que provee
 * la sesión (correo y nombre) para prellenar el formulario de completar
 * registro, preservando la ruta `from` de retorno.
 */
export function buildRegistrationPrefillQuery(
  user: User,
  profile: ProfileRow | null,
  currentSearchParams: URLSearchParams | null,
): string {
  const params = new URLSearchParams();
  params.set('complete', '1');
  if (user.email !== undefined && user.email !== '') {
    params.set('email', user.email);
  }
  const fullName = user.user_metadata?.full_name ?? profile?.full_name;
  if (typeof fullName === 'string' && fullName.trim() !== '') {
    params.set('name', fullName);
  }
  const from = currentSearchParams?.get('from');
  if (from !== null && from !== undefined && from !== '') {
    params.set('from', from);
  }
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}
