import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStaffPermissions } from '../hooks/useStaffPermissions';
import type { MerchantStaffPermissions, UserRole } from '../types/database';

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  /** Permiso granular requerido para merchant_staff. Ignorado para otros roles. */
  requiredPermission?: keyof MerchantStaffPermissions;
  /**
   * Destino alternativo cuando el rol no cumple. Por defecto cada rol va a su
   * inicio (customer → /, merchant → /admin).
   */
  redirectTo?: string;
}

/**
 * Componente wrapper para proteger rutas según autenticación, roles y permisos
 * de usuario. Los permisos solo se verifican para el rol merchant_staff.
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  const { permissions: staffPermissions, isLoading: isLoadingPermissions } =
    useStaffPermissions();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (user === null) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }

  // Verificar rol requerido
  if (requiredRole !== undefined) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const isAllowed = profile !== null && roles.includes(profile.role);
    if (!isAllowed) {
      if (redirectTo !== undefined) {
        return <Navigate to={redirectTo} replace />;
      }
      if (profile === null || profile.role === 'customer') {
        return <Navigate to="/" replace />;
      }
      if (profile.role === 'driver') {
        return <Navigate to="/driver" replace />;
      }
      return <Navigate to="/admin" replace />;
    }
  }

  // Verificar permiso granular para merchant_staff
  if (
    requiredPermission !== undefined &&
    profile?.role === 'merchant_staff' &&
    !isLoadingPermissions
  ) {
    const hasPermission = staffPermissions?.[requiredPermission] === true;
    if (!hasPermission) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
}
