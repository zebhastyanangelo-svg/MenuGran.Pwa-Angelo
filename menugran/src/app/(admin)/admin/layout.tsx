'use client';

import { ClipboardList, BarChart3, Users, Settings, UtensilsCrossed } from 'lucide-react';
import SidebarShell from '@/components/shared/SidebarShell';

const nav = [
  { label: 'Menú', href: '/admin/menu', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Staff', href: '/admin/staff', icon: <Users className="h-5 w-5" /> },
  { label: 'Configuración', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarShell
      brand={{ name: 'MenuGran Admin', href: '/admin/menu', icon: <UtensilsCrossed className="h-6 w-6" /> }}
      nav={nav}
      header={{ eyebrow: 'Administración', title: 'Panel de administración' }}
      user={{ initials: 'A', name: 'Andrea', role: 'Administrador' }}
    >
      {children}
    </SidebarShell>
  );
}