'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faBox, faMagnifyingGlass, faCartShopping, faUser } from '@fortawesome/free-solid-svg-icons';
import { useCartStore } from '@/modules/cart/store';
import CartDrawer from '@/modules/cart/CartDrawer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((state) => state.items);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/client" className="text-2xl font-bold text-brand-500">
              MenuGran
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-neutral-100 px-4 py-3 shadow-soft md:mx-6 md:max-w-xl">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 text-neutral-500" />
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
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-ink-light transition hover:bg-neutral-200"
              aria-label="Abrir carrito"
            >
              <FontAwesomeIcon icon={faCartShopping} className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-white">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 py-6 md:px-6">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 p-3 shadow-elevated md:hidden">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-2">
          <Link href="/client" className="flex flex-col items-center gap-1 text-ink-light hover:text-brand-500 transition-colors">
            <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Inicio</span>
          </Link>
          <Link href="/client/orders" className="flex flex-col items-center gap-1 text-ink-light hover:text-brand-500 transition-colors">
            <FontAwesomeIcon icon={faBox} className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Pedidos</span>
          </Link>
          <Link href="/client/profile" className="flex flex-col items-center gap-1 text-ink-light hover:text-brand-500 transition-colors">
            <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Perfil</span>
          </Link>
        </nav>
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
