'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, User, Lock } from 'lucide-react';
import Link from 'next/link';

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cedula.trim()) {
      setError('Por favor ingresa tu cédula');
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), pin }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Error al iniciar sesión');
        setIsLoading(false);
        return;
      }

      if (data.user.role !== 'SUPERADMIN') {
        setError('No tienes permisos de superadministrador');
        setIsLoading(false);
        return;
      }

      window.localStorage.setItem('menugran-user', JSON.stringify(data.user));
      router.push('/sa');
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white shadow-xl rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600">
            <Globe className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Superadmin</h1>
          <p className="text-sm text-slate-500">Panel de control global de MenuGran</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-slate-700 mb-2">
              Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="block w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                placeholder="Ingresa tu cédula"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-slate-700 mb-2">
              PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="block w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                placeholder="****"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
