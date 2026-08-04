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

      if (data.user.role !== 'SUPER_ADMIN') {
        setError('No tienes permisos de superadministrador');
        setIsLoading(false);
        return;
      }

      window.localStorage.setItem('menugran-user', JSON.stringify(data.user));
      router.push('/admin');
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-cream-50 shadow-xl rounded-3xl p-8 border border-cream-200">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-100 text-brand-600">
            <Globe className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink mb-2">Superadmin</h1>
          <p className="text-sm text-ink-light font-display">Panel de control global de MenuGran</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-display font-medium text-ink mb-2">
              Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-ink-lighter" />
              </div>
              <input
                id="cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="block w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 pl-10 pr-3 text-ink placeholder:text-ink-lighter focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 font-display"
                placeholder="Ingresa tu cédula"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-display font-medium text-ink mb-2">
              PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-ink-lighter" />
              </div>
              <input
                id="pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="block w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 pl-10 pr-3 text-ink placeholder:text-ink-lighter focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 font-display"
                placeholder="****"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 font-display">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-display font-semibold text-cream-50 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}