'use client';

import { Package, Bike, ClipboardList } from 'lucide-react';
import SidebarShell from '@/components/shared/SidebarShell';

const nav = [
  { label: 'Pedidos', href: '/operator', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'En Cocina', href: '/operator/orders', icon: <Package className="h-5 w-5" /> },
  { label: 'Repartidores', href: '/operator/riders', icon: <Bike className="h-5 w-5" /> },
];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarShell
      brand={{ name: 'Operador', href: '/operator', icon: <ClipboardList className="h-6 w-6" /> }}
      nav={nav}
      header={{ eyebrow: 'Operaciones', title: 'Panel de operador' }}
    >
      {children}
    </SidebarShell>
  );
}