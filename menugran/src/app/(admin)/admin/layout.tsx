'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, BarChart3, Users, Settings, UtensilsCrossed, Menu } from 'lucide-react';

const navItems = [
  { label: 'Menú', href: '/admin/menu', icon: ClipboardList },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Staff', href: '/admin/staff', icon: Users },
  { label: 'Configuración', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => item.href === pathname);
    return active ? active.label.replace(/^./, (c) => c) : 'Panel de administración';
  }, [pathname]);

  return (
    <div className="min-h-screen bg-neutral-100 text-ink">
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink text-neutral-100 shadow-popover transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between px-5 py-6">
          <div>
            <Link href="/admin/menu" className="mb-10 flex items-center gap-3 text-xl font-bold text-white">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-lg shadow-soft">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <span>MenuGran Admin</span>
            </Link>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? 'bg-brand-500 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-6">
            <Link
              href="/"
              className="flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              Volver al sitio
            </Link>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-4 py-4 shadow-soft backdrop-blur-md md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-ink-light shadow-soft transition hover:bg-neutral-50 md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Panel administrativo</p>
                <h1 className="text-2xl font-semibold text-ink">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden shrink-0 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-500 md:block">
                Admin</div>
              <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-soft">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-lg text-white">A</div>
                <div>
                  <p className="text-sm font-semibold text-ink">Andrea</p>
                  <p className="text-xs text-neutral-500">Administrador</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-neutral-100 px-4 py-6 md:px-6">
          <div className="rounded-xl bg-white p-6 shadow-soft border border-neutral-200 animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
