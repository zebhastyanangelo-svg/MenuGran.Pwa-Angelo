'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { UserPlus, User, Store, Mail, Phone, Lock } from 'lucide-react';
import Link from 'next/link';

type AccountType = 'CUSTOMER' | 'MERCHANT';

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('CUSTOMER');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    negocio: '',
    sector: '',
    aceptarTerminos: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    if (field === 'telefono') {
      value = String(value).replace(/\D/g, '');
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectType = (type: AccountType) => {
    setAccountType(type);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    if (!formData.telefono.trim()) {
      setError('Por favor ingresa tu teléfono');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (accountType === 'MERCHANT' && !formData.negocio.trim()) {
      setError('Por favor ingresa el nombre de tu negocio');
      return;
    }
    if (!formData.aceptarTerminos) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.nombre.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.telefono,
          password: formData.password,
          role: accountType,
          businessName: accountType === 'MERCHANT' ? formData.negocio.trim() : undefined,
          sector: accountType === 'MERCHANT' ? formData.sector.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo registrar');
        setIsLoading(false);
        return;
      }

      await signIn('credentials', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
      });

      router.push(accountType === 'MERCHANT' ? '/merchant-portal/dashboard' : '/');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  const inputClass =
    'block w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100';

  return (
    <div className="w-full max-w-md">
      <div className="bg-white shadow-xl rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600">
            <UserPlus className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Crear Cuenta</h1>
          <p className="text-sm text-slate-500">Únete a MenuGran</p>
        </div>

        {/* Selector de tipo de cuenta */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => selectType('CUSTOMER')}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
              accountType === 'CUSTOMER'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <UserPlus className="h-6 w-6" />
            <span className="text-sm font-semibold">Soy Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => selectType('MERCHANT')}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
              accountType === 'MERCHANT'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Store className="h-6 w-6" />
            <span className="text-sm font-semibold">Tengo un Negocio</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-slate-700 mb-2">
              Nombre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserPlus className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className={inputClass}
                placeholder="Ingresa tu nombre completo"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClass}
                placeholder="tucorreo@ejemplo.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-slate-700 mb-2">
              Teléfono
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="telefono"
                type="text"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className={inputClass}
                placeholder="Ingresa tu teléfono"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                type="password"
                minLength={6}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={inputClass}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
              />
            </div>
          </div>

          {accountType === 'MERCHANT' && (
            <>
              <div>
                <label htmlFor="negocio" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del negocio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="negocio"
                    type="text"
                    value={formData.negocio}
                    onChange={(e) => handleChange('negocio', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Arepera Los Llanos"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sector" className="block text-sm font-medium text-slate-700 mb-2">
                  Sector / Ubicación
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="sector"
                    type="text"
                    value={formData.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Centro de Cúa, Charallave"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <input
              id="aceptarTerminos"
              type="checkbox"
              checked={formData.aceptarTerminos}
              onChange={(e) => handleChange('aceptarTerminos', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              disabled={isLoading}
            />
            <label htmlFor="aceptarTerminos" className="text-sm text-slate-700">
              Acepto los términos y condiciones
            </label>
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
            {isLoading ? 'Registrando...' : accountType === 'MERCHANT' ? 'Registrar mi negocio' : 'Registrarme'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}