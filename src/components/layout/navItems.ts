import type { LucideIcon } from 'lucide-react';
import { Home, ShoppingCart, LayoutDashboard, Settings, Store, UserRound, Building2, UtensilsCrossed, ListChecks, ClipboardList } from 'lucide-react';
import type { MerchantStaffPermissions, UserRole } from '../../types/database';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Permiso requerido (solo aplica a merchant_staff con permisos cargados). */
  requiredPermission?: keyof MerchantStaffPermissions;
  /** Ocultar a empleados sin permisos de administración (solo owner). */
  ownerOnly?: boolean;
}

export const customerNavItems: NavItem[] = [
  { to: '/marketplace', label: 'Inicio', icon: Home },
  { to: '/checkout', label: 'Carrito', icon: ShoppingCart },
  { to: '/profile', label: 'Perfil', icon: UserRound },
];

export const merchantNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/admin', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/dishes', label: 'Platos', icon: UtensilsCrossed, requiredPermission: 'can_manage_menu' },
  { to: '/admin/settings', label: 'Configuración', icon: Settings, ownerOnly: true },
  { to: '/admin/profile', label: 'Perfil', icon: Store },
];

export const superadminNavItems: NavItem[] = [
  { to: '/super-admin/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/super-admin', label: 'Negocios', icon: Building2 },
  { to: '/super-admin/profile', label: 'Perfil', icon: UserRound },
];

export const driverNavItems: NavItem[] = [
  { to: '/driver', label: 'Entregas', icon: ListChecks },
  { to: '/profile', label: 'Perfil', icon: UserRound },
];

const merchantRoles: UserRole[] = ['merchant_owner', 'merchant_staff'];

/**
 * Resuelve los items del panel según el rol. Los empleados (merchant_staff)
 * solo ven las secciones habilitadas por sus permisos granularizados:
 * - can_manage_menu → Platos
 * - Configuración queda reservada al propietario (ownerOnly).
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
