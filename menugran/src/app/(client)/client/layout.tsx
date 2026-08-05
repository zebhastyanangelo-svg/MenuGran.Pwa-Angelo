'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { CartDrawer } from '@/modules/cart';
import { useCartStore } from '@/modules/cart/store';
import StickyBottomNav from '@/components/ui/StickyBottomNav';
import CategoryChips from '@/components/ui/CategoryChips';
import { useFilterStore } from '@/modules/filter';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setCategory = useFilterStore((state) => state.setCategory);
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <div className="min-h-screen bg-primary-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/client" className="font-display text-2xl font-bold text-primary-600">
              MenuGran
            </Link>
          </div>

          {/* Search bar (spec: editorial layout) */}
          <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-cream-50 border border-neutral-200 px-4 py-3 shadow-soft md:mx-6 md:max-w-xl">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="search"
              placeholder="Buscar restaurantes o platos"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-neutral-400"
              aria-label="Buscar restaurantes o platos"
            />
          </div>

          {/* Desktop cart button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative hidden h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition hover:bg-primary-100 md:inline-flex"
            aria-label="Abrir carrito"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A1 1 0 006.55 17h10.9M17 17a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Category chips (spec: Interactive Category Chips) */}
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <CategoryChips onFilterChange={setCategory} />
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 py-6 pb-28 md:px-6 md:pb-10">
        {children}
      </main>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Sticky bottom nav (spec: Sticky Bottom Navigation) */}
      <StickyBottomNav onCartClick={() => setDrawerOpen(true)} cartCount={cartCount} />
    </div>
  );
}
