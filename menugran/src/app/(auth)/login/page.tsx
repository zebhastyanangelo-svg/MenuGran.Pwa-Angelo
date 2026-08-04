'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, Store } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Ingresa tu email');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setError('Email o contraseña incorrectos');
        setLoading(false);
        return;
      }

      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) throw new Error('Error al obtener la sesión');
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (redirectTo && redirectTo.startsWith('/')) {
        router.push(redirectTo);
      } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'MERCHANT' || role === 'EMPLOYEE') {
        router.push('/merchant-portal/dashboard');
      } else {
        router.push('/client');
      }
    } catch {
      setError('Error de conexion');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 to-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="receipt shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
              <Store className="h-8 w-8 text-brand-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Iniciar Sesión</h1>
            <p className="text-ink-light mt-1 font-body">Ingresa a tu cuenta MenuGran</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1 font-body">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Mail className="h-5 w-5 text-ink-lighter" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-cream-50 text-ink placeholder:text-ink-lighter input"
                  placeholder="tucorreo@ejemplo.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1 font-body">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock className="h-5 w-5 text-ink-lighter" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-cream-50 text-ink placeholder:text-ink-lighter input"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm font-body">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 text-cream-50 py-3 rounded-lg font-body font-medium hover:bg-brand-700 disabled:opacity-50 transition"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cream-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-cream-50 text-ink-lighter font-body">o</span>
              </div>
            </div>

            <Link
              href="/register"
              className="block w-full text-center py-3 border border-brand-600 text-brand-600 rounded-lg font-body font-medium hover:bg-brand-50 transition"
            >
              Crear cuenta nueva
            </Link>

            <div className="text-sm text-ink-lighter font-body space-x-2">
              <span>¿Personal del negocio?</span>
              <Link href="/admin-login" className="text-brand-600 hover:underline">
                Acceso con cédula
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}