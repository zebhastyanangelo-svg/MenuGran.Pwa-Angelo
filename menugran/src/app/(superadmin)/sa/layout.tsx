'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  Settings,
  Bell,
  Menu,
  ShieldAlert,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/sa', icon: LayoutDashboard },
  { label: 'Negocios', href: '/sa/businesses', icon: Building2 },
  { label: 'Usuarios', href: '/sa/users', icon: Users },
  { label: 'Métricas Globales', href: '/sa/metrics', icon: TrendingUp },
  { label: 'Configuración', href: '/sa/settings', icon: Settings },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className={`fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-950 text-white shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-6 px-5 py-6">
            <Link href="/sa" className="flex items-center gap-3 rounded-3xl bg-slate-900 px-4 py-4 shadow-sm ring-1 ring-white/10">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-sm font-semibold">MenuGran SA</p>
                <p className="text-xs text-slate-400">Panel principal</p>
              </div>
            </Link>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 px-5 py-6">
            <div className="flex items-center gap-3 rounded-3xl bg-slate-900 px-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white font-semibold">SA</div>
              <div>
                <p className="text-sm font-semibold">Aurora Vega</p>
                <p className="text-xs text-slate-400">aurora@menugran.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/5 bg-white/90 backdrop-blur md:px-8 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">{navItems.find((item) => item.href === pathname)?.label ?? 'Dashboard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                Ver como...
              </button>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm hover:bg-slate-800 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
