'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Search, Map, User } from 'lucide-react';
import { CartDrawer } from '@/modules/cart';
import { useCartStore, selectTotal } from '@/modules/cart/store';

const tabs = [
  { label: 'Inicio', href: '/client', icon: Home },
  { label: 'Seguimiento', href: '/client/tracking', icon: Map },
  { label: 'Perfil', href: '/client/profile', icon: User },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const total = useCartStore(selectTotal);
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-cream-50/95 backdrop-blur-md shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/client" className="font-display text-2xl font-bold text-brand-700">
              MenuGran
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-soft md:mx-6 md:max-w-xl">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="search"
              placeholder="Buscar restaurantes o platos"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-neutral-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cream-100 text-ink-light transition hover:bg-cream-200"
              aria-label="Abrir carrito"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A1 1 0 006.55 17h10.9M7 13L5.4 5M17 17a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 py-6 pb-24 md:px-6 md:pb-6">
        {children}
      </main>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-cream-50/95 px-2 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold text-neutral-500 transition-colors hover:text-ink-light"
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}