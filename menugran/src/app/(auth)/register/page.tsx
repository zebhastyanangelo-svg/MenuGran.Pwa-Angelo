'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Phone, Lock } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    pin: '',
    aceptarTerminos: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    if (field === 'cedula' || field === 'telefono') {
      value = String(value).replace(/\D/g, '');
    }
    if (field === 'pin') {
      value = String(value).replace(/\D/g, '').slice(0, 4);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!formData.cedula.trim()) {
      setError('Por favor ingresa tu cédula');
      return;
    }
    if (!formData.telefono.trim()) {
      setError('Por favor ingresa tu teléfono');
      return;
    }
    if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
      setError('El PIN debe tener exactamente 4 dígitos');
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
          cedula: formData.cedula,
          phone: formData.telefono,
          pin: formData.pin,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo registrar');
        setIsLoading(false);
        return;
      }

      window.localStorage.setItem('menugran-user', JSON.stringify(data.user));
      router.push('/client');
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="bg-white shadow-elevated rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
            <UserPlus className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Crear Cuenta</h1>
          <p className="text-sm text-neutral-500">Únete a MenuGran</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-ink mb-2">
              Nombre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className="input pl-10"
                placeholder="Ingresa tu nombre completo"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-ink mb-2">
              Cédula
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="cedula"
                type="text"
                value={formData.cedula}
                onChange={(e) => handleChange('cedula', e.target.value)}
                className="input pl-10"
                placeholder="Ingresa tu cédula"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-ink mb-2">
              Teléfono
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="telefono"
                type="text"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="input pl-10"
                placeholder="Ingresa tu teléfono"
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
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => handleChange('pin', e.target.value)}
                className="input pl-10"
                placeholder="****"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="aceptarTerminos"
              type="checkbox"
              checked={formData.aceptarTerminos}
              onChange={(e) => handleChange('aceptarTerminos', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
              disabled={isLoading}
            />
            <label htmlFor="aceptarTerminos" className="text-sm text-ink-light">
              Acepto los términos y condiciones
            </label>
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
            {isLoading ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-brand-500 hover:text-brand-600 transition-colors">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
