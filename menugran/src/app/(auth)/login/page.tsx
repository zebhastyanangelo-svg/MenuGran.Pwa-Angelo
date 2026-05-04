'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación
    if (!cedula.trim()) {
      setError('Por favor ingresa tu cédula');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    // Enviar a API real
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), pin }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Error al iniciar sesión');
        setIsLoading(false);
        return;
      }

      // Redirigir según el rol
      const role = data.user.role;
      if (role === 'CLIENT') router.push('/client');
      else if (role === 'OPERATOR') router.push('/operator');
      else if (role === 'ADMIN') router.push('/admin');
      else if (role === 'RIDER') router.push('/rider');
      else if (role === 'SUPERADMIN') router.push('/sa');
      else router.push('/client');
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
          <p className="text-gray-500">Ingresa a tu cuenta MenuGran</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-gray-700 mb-2">
              Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="cedula"
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-500"
                placeholder="Ingresa tu cédula"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-500"
                placeholder="****"
                disabled={isLoading}
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
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <Link href="/forgot-pin" className="text-sm text-gray-600 hover:text-red-600 transition-colors">
            ¿Olvidaste tu PIN?
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>

          <Link
            href="/register"
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Crear cuenta nueva
          </Link>
        </div>
      </div>
    </div>
  );
}