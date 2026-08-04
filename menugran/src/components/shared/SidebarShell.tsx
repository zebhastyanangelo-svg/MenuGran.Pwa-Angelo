'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface SidebarShellProps {
  brand: { name: string; href: string; icon: ReactNode };
  nav: NavItem[];
  header: { eyebrow?: string; title: string };
  user?: { initials: string; name: string; role: string };
  children: ReactNode;
}

export default function SidebarShell({
  brand,
  nav,
  header,
  user,
  children,
}: SidebarShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink text-cream-50 shadow-2xl transition-transform duration-300 md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-6 px-5 py-6">
            <Link
              href={brand.href}
              className="flex items-center gap-3 rounded-2xl bg-brand-600/20 px-4 py-3 ring-1 ring-brand-500/20"
              onClick={() => setOpen(false)}
            >
              <span className="text-brand-400">{brand.icon}</span>
              <span className="font-display text-lg font-bold text-cream-50">
                {brand.name}
              </span>
            </Link>

            <nav className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-cream-200 hover:bg-ink-light hover:text-cream-50'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {user && (
            <div className="border-t border-cream-50/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream-100">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-cream-300">{user.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-cream-50/90 backdrop-blur px-4 py-3 shadow-sm md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white p-2 text-ink-light shadow-sm md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                {header.eyebrow && (
                  <p className="section-eyebrow">{header.eyebrow}</p>
                )}
                <h1 className="font-display text-xl font-bold text-ink">
                  {header.title}
                </h1>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-soft">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                  {user.initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-ink">{user.name}</p>
                  <p className="text-xs text-ink-lighter">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}