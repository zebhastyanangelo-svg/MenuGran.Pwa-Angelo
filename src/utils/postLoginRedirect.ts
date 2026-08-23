import type { UserRole } from '../types/database';

export const SUPER_ADMIN_HOME = '/super-admin/dashboard';
export const MERCHANT_HOME = '/merchant/dashboard';
export const CUSTOMER_HOME = '/marketplace';

/**
 * Resuelve el destino post-login de forma unificada por rol:
 * - Honra la ruta `from` si existe (retorno tras ser redirigido al login).
 * - superadmin → /super-admin/dashboard
 * - merchant_owner → /merchant/dashboard (panel del comercio)
 * - customer y resto → catálogo público (/marketplace)
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
  if (role === 'merchant_owner') {
    return MERCHANT_HOME;
  }
  return CUSTOMER_HOME;
}
