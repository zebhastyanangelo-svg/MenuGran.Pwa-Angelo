'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), pin }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Error al iniciar sesion');
        setLoading(false);
        return;
      }

      // Guardar usuario en localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirigir segun rol
      const role = data.user.role;
      if (role === 'CLIENT') router.push('/client');
      else if (role === 'OPERATOR') router.push('/operator');
      else if (role === 'ADMIN') router.push('/admin');
      else if (role === 'RIDER') router.push('/rider');
      else if (role === 'SUPERADMIN') router.push('/sa');
      else router.push('/client');
    } catch (err) {
      setError('Error de conexion');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Store className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Iniciar Sesion</h1>
            <p className="text-gray-500 mt-1">Ingresa a tu cuenta MenuGran</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cedula
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ingresa tu cedula"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="****"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link href="/forgot-pin" className="text-sm text-gray-500 hover:text-red-600">
              Olvidaste tu PIN?
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">o</span>
              </div>
            </div>

            <Link
              href="/register"
              className="block w-full text-center py-3 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
            >
              Crear cuenta nueva
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}