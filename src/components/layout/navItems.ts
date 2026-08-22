import type { LucideIcon } from 'lucide-react';
import { Home, ShoppingCart, LayoutDashboard, Settings, Store, UserRound, Building2 } from 'lucide-react';
import type { UserRole } from '../../types/database';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const customerNavItems: NavItem[] = [
  { to: '/marketplace', label: 'Inicio', icon: Home },
  { to: '/checkout', label: 'Carrito', icon: ShoppingCart },
  { to: '/profile', label: 'Perfil', icon: UserRound },
];

export const merchantNavItems: NavItem[] = [
  { to: '/admin', label: 'Inicio', icon: LayoutDashboard },
  { to: '/admin/settings', label: 'Configuración', icon: Settings },
  { to: '/admin/profile', label: 'Perfil', icon: Store },
];

export const superadminNavItems: NavItem[] = [
  { to: '/admin', label: 'Inicio', icon: LayoutDashboard },
  { to: '/super-admin', label: 'Negocios', icon: Building2 },
  { to: '/admin/profile', label: 'Perfil', icon: Store },
];

const merchantRoles: UserRole[] = ['merchant_owner', 'merchant_staff'];

export function getNavItemsForRole(role: UserRole | null | undefined): NavItem[] {
  if (role === 'superadmin') {
    return superadminNavItems;
  }
  if (role !== null && role !== undefined && merchantRoles.includes(role)) {
    return merchantNavItems;
  }
  return customerNavItems;
}

export const authRoutes = ['/login', '/register'];
