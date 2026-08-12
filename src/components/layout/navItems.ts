import type { LucideIcon } from 'lucide-react';
import { Home, ShoppingCart, LayoutDashboard } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: '/marketplace', label: 'Inicio', icon: Home },
  { to: '/checkout', label: 'Carrito', icon: ShoppingCart },
  { to: '/merchant/dashboard', label: 'Panel', icon: LayoutDashboard },
];

export const authRoutes = ['/login', '/register'];
