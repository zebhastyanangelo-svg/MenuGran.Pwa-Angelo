'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Package, Bike, ClipboardList, UtensilsCrossed } from 'lucide-react';

const navigation = [
  { name: 'Pedidos', href: '/operator', icon: ClipboardList },
  { name: 'En Cocina', href: '/operator/orders', icon: Package },
  { name: 'Repartidores', href: '/operator/riders', icon: Bike },
];

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cream-50">
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink text-white shadow-popover transition-transform duration-300 md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 py-6 border-b border-neutral-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-soft">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">MenuGran</p>
              <p className="text-xs text-neutral-400">Panel Operador</p>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-500 text-white shadow-soft' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 py-4 shadow-soft md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-ink-light shadow-soft md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-ink">Panel de Operador</h2>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
              <span className="hidden sm:inline">Operador</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}