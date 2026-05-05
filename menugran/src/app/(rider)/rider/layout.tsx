'use client';

import { useState } from 'react';
import { Bike, ToggleLeft, ToggleRight } from 'lucide-react';

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [available, setAvailable] = useState(true);

  return (
    <div className={`min-h-screen ${available ? 'bg-gray-50' : 'bg-gray-100'} text-gray-900`}>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bike className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">MenuGran Rider</p>
              <p className="text-sm font-semibold text-gray-900">
                {available ? 'Disponible para pedidos' : 'No disponible'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAvailable((prev) => !prev)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              available
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
            }`}
          >
            {available ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            {available ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </header>

      {!available && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3 text-center text-sm text-yellow-700">
          Estas inactivo. Activa tu estado para recibir pedidos.
        </div>
      )}

      <main className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}