import type { UserRole } from '../types/database';

export const SUPER_ADMIN_HOME = '/super-admin/dashboard';
export const MERCHANT_HOME = '/admin';
export const DRIVER_HOME = '/driver/deliveries';
/** Home del cliente: la raíz; el router la materializa en el marketplace. */
export const CUSTOMER_HOME = '/';

const MERCHANT_PATHS = ['/admin', '/merchant', '/super-admin'];

function isMerchantPath(path: string): boolean {
  return MERCHANT_PATHS.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/'),
  );
}

function isMerchantRole(role: UserRole): boolean {
  return role === 'merchant_owner' || role === 'merchant_staff';
}

function resolveRoleHome(role: UserRole | null | undefined): string {
  if (role === 'superadmin') {
    return SUPER_ADMIN_HOME;
  }
  if (role !== null && role !== undefined && isMerchantRole(role)) {
    return MERCHANT_HOME;
  }
  if (role === 'driver') {
    return DRIVER_HOME;
  }
  return CUSTOMER_HOME;
}

/**
 * Resuelve el destino post-login de forma unificada por rol:
 * - Honra la ruta `from` si existe (retorno tras ser redirigido al login),
 *   excepto cuando la ruta pertenece al panel del comercio y el rol es driver.
 * - superadmin → /super-admin/dashboard
 * - merchant_owner / merchant_staff → /admin (panel del comercio)
 * - driver → /driver/deliveries (panel de reparto)
 * - customer y resto → '/' (home del cliente, resuelto al marketplace)
 */
export function getPostLoginPath(
  requestedFrom: string | null,
  role: UserRole | null | undefined,
): string {
  if (requestedFrom !== null && requestedFrom !== '') {
    // Los drivers no deben volver a rutas de comercio/administración
    if (role === 'driver' && isMerchantPath(requestedFrom)) {
      return DRIVER_HOME;
    }
    return requestedFrom;
  }
  return resolveRoleHome(role);
}
