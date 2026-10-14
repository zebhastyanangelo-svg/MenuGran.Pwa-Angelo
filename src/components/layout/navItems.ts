import type { MerchantStaffPermissions, UserRole } from '../../types/database';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Permiso requerido (solo aplica a merchant_staff con permisos cargados). */
  requiredPermission?: keyof MerchantStaffPermissions;
  /** Ocultar a empleados sin permisos de administración (solo owner). */
  ownerOnly?: boolean;
}

export const customerNavItems: NavItem[] = [
  { to: '/marketplace', label: 'Inicio', icon: 'fa-solid fa-house' },
  { to: '/checkout', label: 'Carrito', icon: 'fa-solid fa-cart-shopping' },
  { to: '/profile', label: 'Perfil', icon: 'fa-solid fa-user' },
];

export const merchantNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Resumen', icon: 'fa-solid fa-chart-line', requiredPermission: 'can_view_metrics' },
  { to: '/admin', label: 'Pedidos', icon: 'fa-solid fa-clipboard-list', requiredPermission: 'can_manage_orders' },
  { to: '/admin/dishes', label: 'Platos', icon: 'fa-solid fa-utensils', requiredPermission: 'can_manage_menu' },
  { to: '/driver/deliveries', label: 'Entregas', icon: 'fa-solid fa-bicycle', requiredPermission: 'can_view_assigned_deliveries' },
  { to: '/admin/settings', label: 'Configuración', icon: 'fa-solid fa-gear', ownerOnly: true },
  { to: '/admin/profile', label: 'Perfil', icon: 'fa-solid fa-store' },
];

export const superadminNavItems: NavItem[] = [
  { to: '/super-admin/dashboard', label: 'Inicio', icon: 'fa-solid fa-chart-line' },
  { to: '/super-admin', label: 'Negocios', icon: 'fa-solid fa-building' },
  { to: '/super-admin/ratings', label: 'Votaciones', icon: 'fa-solid fa-star-half-stroke' },
  { to: '/super-admin/users', label: 'Usuarios', icon: 'fa-solid fa-users' },
  { to: '/super-admin/profile', label: 'Perfil', icon: 'fa-solid fa-user' },
];

export const driverNavItems: NavItem[] = [
  { to: '/driver/deliveries', label: 'Entregas', icon: 'fa-solid fa-bicycle' },
  { to: '/profile', label: 'Perfil', icon: 'fa-solid fa-user' },
];

const merchantRoles: UserRole[] = ['merchant_owner', 'merchant_staff'];

/**
 * Resuelve los items del panel según el rol. Los empleados (merchant_staff)
 * solo ven las secciones habilitadas por sus permisos granularizados:
 * - can_view_metrics → Resumen
 * - can_manage_orders → Pedidos
 * - can_manage_menu → Platos
 * - Configuración queda reservada al propietario (ownerOnly).
 * - Perfil siempre visible.
 */
export function getNavItemsForRole(
  role: UserRole | null | undefined,
  staffPermissions?: MerchantStaffPermissions | null,
): NavItem[] {
  if (role === 'superadmin') {
    return superadminNavItems;
  }
  if (role === 'driver') {
    return driverNavItems;
  }
  if (role !== null && role !== undefined && merchantRoles.includes(role)) {
    return merchantNavItems.filter((item) => {
      if (item.ownerOnly === true) {
        return role !== 'merchant_staff';
      }
      if (
        item.requiredPermission !== undefined &&
        role === 'merchant_staff'
      ) {
        // Sin permisos cargados aún: mostrar solo secciones siempre visibles.
        return staffPermissions?.[item.requiredPermission] === true;
      }
      return true;
    });
  }
  return customerNavItems;
}

export const authRoutes = ['/login', '/register'];
