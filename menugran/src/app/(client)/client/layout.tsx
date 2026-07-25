'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Package, Search, ShoppingCart, User, X } from 'lucide-react';
import { useCartStore } from '@/modules/cart/store';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/client" className="text-2xl font-bold text-red-600">
              MenuGran
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-between gap-3 rounded-3xl bg-slate-100 px-4 py-3 shadow-sm md:mx-6 md:max-w-xl">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="Buscar restaurantes o platos"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Abrir carrito"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-base font-semibold text-white">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-6xl px-4 py-6 md:px-6">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-lg md:hidden">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-2">
          <Link href="/client" className="flex flex-col items-center gap-1 text-slate-700 hover:text-red-600">
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Inicio</span>
          </Link>
          <Link href="/client/orders" className="flex flex-col items-center gap-1 text-slate-700 hover:text-red-600">
            <Package className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Pedidos</span>
          </Link>
          <Link href="/client/profile" className="flex flex-col items-center gap-1 text-slate-700 hover:text-red-600">
            <User className="h-5 w-5" />
            <span className="text-[11px] font-semibold">Perfil</span>
          </Link>
        </nav>
      </div>

      <div className={`fixed inset-0 z-40 ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tu Pedido</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Resumen</h2>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-2xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
              aria-label="Cerrar carrito"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex h-full flex-col justify-between px-6 py-5">
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-slate-600">
                <div className="text-4xl">🛒</div>
                <p className="text-lg font-semibold text-slate-900">Tu carrito está vacío</p>
                <p className="max-w-xs text-sm text-slate-500">Agrega platos y regresa cuando estés listo para pedir.</p>
                <Link
                  href="/client"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Ver restaurantes
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-4 overflow-y-auto pb-4">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.quantity} x ${item.price}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-slate-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Total</span>
                    <span className="font-semibold text-slate-900">${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-3xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Hacer Pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setDrawerOpen(false);
                    }}
                    className="w-full rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Limpiar carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
