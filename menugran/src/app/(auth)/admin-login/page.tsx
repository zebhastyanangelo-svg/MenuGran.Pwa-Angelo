'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faStore } from '@fortawesome/free-solid-svg-icons';
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

      if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
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
    <div className="w-full max-w-md animate-fade-in">
      <div className="bg-white shadow-elevated rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
            <FontAwesomeIcon icon={faStore} className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Panel de Administrador</h1>
          <p className="text-neutral-500">Acceso exclusivo para dueños de restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-ink mb-2">
              Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="input pl-10"
                placeholder="Ingresa tu cédula"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-ink mb-2">
              PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input pl-10"
                placeholder="****"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary btn-md w-full"
          >
            {isLoading ? 'Cargando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-neutral-600 hover:text-brand-500 transition-colors">
            ¿Eres cliente? Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
