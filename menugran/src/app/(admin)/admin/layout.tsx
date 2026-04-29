'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '📋 Menú', href: '/admin/menu' },
  { label: '📊 Analytics', href: '/admin/analytics' },
  { label: '👥 Staff', href: '/admin/staff' },
  { label: '⚙️ Configuración', href: '/admin/settings' },
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
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-100 shadow-2xl transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between px-5 py-6">
          <div>
            <Link href="/admin/menu" className="mb-10 flex items-center gap-3 text-xl font-bold text-white">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 text-lg shadow-sm">
                🍽️
              </span>
              <span>MenuGran Admin</span>
            </Link>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? 'bg-red-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-6">
            <Link
              href="/"
              className="flex items-center justify-center rounded-full border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Volver al sitio
            </Link>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-md md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
                aria-label="Abrir menú"
              >
                <span className="text-xl">☰</span>
              </button>

              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Panel administrativo</p>
                <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500 md:block">
                Admin</div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-lg text-white">A</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Andrea</p>
                  <p className="text-xs text-slate-500">Administrador</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-6 md:px-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/60">{children}</div>
        </main>
      </div>
    </div>
  );
}
