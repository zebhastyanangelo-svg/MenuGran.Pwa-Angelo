'use client';

import { useState } from 'react';

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [available, setAvailable] = useState(true);

  return (
    <div className={`min-h-screen ${available ? 'bg-white' : 'bg-gray-100'} text-gray-900`}>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">MenuGran Rider</p>
            <p className="text-sm font-semibold text-gray-900">Estado de disponibilidad</p>
          </div>
          <button
            type="button"
            onClick={() => setAvailable(prev => !prev)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${available ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            {available ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </header>

      {!available && (
        <div className="bg-gray-200 px-4 py-4 text-center text-sm text-gray-700">
          Estás inactivo. Activa tu estado para recibir pedidos.
        </div>
      )}

      <main className={`min-h-[calc(100vh-72px)] ${available ? 'bg-white' : 'bg-gray-100'} px-4 py-5 sm:px-5`}>
        <div className="mx-auto max-w-xl">
          <div className={`rounded-3xl border border-gray-200 bg-white shadow-sm p-4 ${available ? '' : 'opacity-80'}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
