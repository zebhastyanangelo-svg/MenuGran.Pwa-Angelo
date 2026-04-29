'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [now, setNow] = useState(new Date());
  const [pendingCount] = useState(7);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const formattedTime = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 text-lg font-bold text-white">MG</span>
            <div>
              <p className="text-sm font-medium text-slate-500">MenuGran</p>
              <p className="text-base font-semibold text-slate-900">Panel de Operador</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white animate-pulse">
                {pendingCount}
              </span>
              <span>Pedidos pendientes</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              <span className="text-slate-500">🕒</span>
              <span>{formattedTime}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <span>🔔</span>
              Notificaciones
            </button>
            <button
              type="button"
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {children}
      </main>

      <nav className="hidden border-t border-slate-200 bg-white/95 px-4 py-4 shadow-sm shadow-slate-200 md:flex md:justify-center md:px-6">
        <div className="flex w-full max-w-3xl items-center justify-around gap-4">
          <Link
            href="/operator"
            className="inline-flex items-center gap-2 rounded-3xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <span>📋</span>
            Pedidos
          </Link>
          <Link
            href="/operator/riders"
            className="inline-flex items-center gap-2 rounded-3xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <span>🏍️</span>
            Repartidores
          </Link>
        </div>
      </nav>
    </div>
  );
}
