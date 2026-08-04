'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bike, Map, ClipboardList, User } from 'lucide-react';
import { useCartStore, selectTotal } from '@/modules/cart/store';

const tabs = [
  { label: 'Disponible', href: '/rider', icon: Bike },
  { label: 'Activos', href: '/rider/active', icon: Map },
  { label: 'Pedidos', href: '/rider/history', icon: ClipboardList },
  { label: 'Perfil', href: '/rider/profile', icon: User },
];

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [available, setAvailable] = useState(true);
  const total = useCartStore(selectTotal);

  return (
    <div className="min-h-screen bg-cream-50 text-ink">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-cream-50/90 px-4 py-3 shadow-sm backdrop-blur md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bike className="h-6 w-6 text-brand-600" />
            <div>
              <p className="eyebrow">MenuGran Rider</p>
              <p className="text-sm font-semibold text-ink">
                {available ? 'Disponible' : 'Inactivo'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAvailable((prev) => !prev)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              available
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-neutral-200 text-ink-light hover:bg-neutral-300'
            }`}
          >
            {available ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </header>

      {!available && (
        <div className="bg-gold-100 border-b border-gold-200 px-4 py-2 text-center text-sm text-gold-800">
          Estás inactivo. Activa tu estado para recibir pedidos.
        </div>
      )}

      <main className="min-h-[calc(100vh-11rem)] px-4 py-5 md:px-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-cream-50/95 px-2 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors ${
                  active ? 'text-brand-700' : 'text-neutral-500 hover:text-ink-light'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
          {total > 0 ? (
            <Link
              href="/client/orders"
              className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold text-brand-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.35 2.7A1 1 0 006.55 17h10.9M7 13L5.4 5M17 17a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Pedidos
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}