import type { UserRole } from '../types/database';

export const SUPER_ADMIN_HOME = '/super-admin';
export const CUSTOMER_HOME = '/marketplace';

/**
 * Resuelve el destino post-login:
 * - Honra la ruta `from` si existe (retorno tras ser redirigido al login).
 * - El Super Admin único aterriza en su panel /super-admin.
 * - El resto de los roles mantiene el comportamiento previo (/marketplace).
 */
export function getPostLoginPath(
  requestedFrom: string | null,
  role: UserRole | null | undefined,
): string {
  if (requestedFrom !== null && requestedFrom !== '') {
    return requestedFrom;
  }
  if (role === 'superadmin') {
    return SUPER_ADMIN_HOME;
  }
  return CUSTOMER_HOME;
}
