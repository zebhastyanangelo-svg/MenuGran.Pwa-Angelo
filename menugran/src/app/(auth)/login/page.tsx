'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { User, Lock, LogIn, Store } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cedula.trim()) {
      setError('Ingresa tu cedula');
      return;
    }
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 digitos');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        cedula: cedula.trim(),
        pin,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setError('Cédula o PIN incorrectos');
        setLoading(false);
        return;
      }

      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (role === 'CLIENT') router.push('/client');
      else if (role === 'RIDER') router.push('/rider');
      else if (role === 'OPERATOR') router.push('/operator');
      else if (role === 'ADMIN') router.push('/admin');
      else if (role === 'SUPERADMIN') router.push('/sa');
      else router.push('/client');
    } catch {
      setError('Error de conexion');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white shadow-elevated rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl mb-4">
              <Store className="h-8 w-8 text-brand-500" />
            </div>
            <h1 className="text-2xl font-bold text-ink">Iniciar Sesion</h1>
            <p className="text-neutral-500 mt-1">Ingresa a tu cuenta MenuGran</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-ink mb-1">
                Cedula
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <User className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="cedula"
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                  className="input pl-10"
                  placeholder="Ingresa tu cedula"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-ink mb-1">
                PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="pin"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input pl-10"
                  placeholder="****"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-md w-full"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link href="/forgot-pin" className="text-sm text-neutral-500 hover:text-brand-500 transition-colors">
              Olvidaste tu PIN?
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-400">o</span>
              </div>
            </div>

            <Link
              href="/register"
              className="btn-secondary btn-md block w-full text-center"
            >
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}