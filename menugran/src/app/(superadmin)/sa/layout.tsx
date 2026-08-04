'use client';

import { LayoutDashboard, Building2, Users, TrendingUp, Settings, Bell, ShieldAlert } from 'lucide-react';
import SidebarShell from '@/components/shared/SidebarShell';

const nav = [
  { label: 'Dashboard', href: '/sa', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Negocios', href: '/sa/businesses', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Usuarios', href: '/sa/users', icon: <Users className="h-5 w-5" /> },
  { label: 'Métricas Globales', href: '/sa/metrics', icon: <TrendingUp className="h-5 w-5" /> },
  { label: 'Configuración', href: '/sa/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarShell
      brand={{ name: 'MenuGran SA', href: '/sa', icon: <ShieldAlert className="h-6 w-6" /> }}
      nav={nav}
      header={{ eyebrow: 'Superadministración', title: 'Panel principal' }}
      user={{ initials: 'SA', name: 'Aurora Vega', role: 'Superadministrador' }}
    >
      {children}
    </SidebarShell>
  );
}