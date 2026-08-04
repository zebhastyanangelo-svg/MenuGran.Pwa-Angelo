'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { User, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
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
      const result = await signIn('credentials', {
        cedula: cedula.trim(),
        pin,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setError('Cédula o PIN incorrectos');
        setIsLoading(false);
        return;
      }

      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setError('No tienes permisos de administrador');
        setIsLoading(false);
        return;
      }

      router.push('/admin');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-cream-50 shadow-xl rounded-2xl p-8 border border-cream-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
            <User className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink mb-2">Panel de Administrador</h1>
          <p className="text-ink-light font-display">Acceso exclusivo para dueños de restaurante</p>
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
                className="block w-full pl-10 pr-3 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-cream-50 text-ink placeholder:text-ink-lighter font-display"
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
                className="block w-full pl-10 pr-3 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-cream-50 text-ink placeholder:text-ink-lighter font-display"
                placeholder="****"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm font-display">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 text-cream-50 py-3 px-4 rounded-lg font-display font-medium hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Cargando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-ink-light hover:text-brand-600 transition-colors font-display">
            ¿Eres cliente? Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}