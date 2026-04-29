'use client';

import { FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';

const loginSchema = z.object({
  cedula: z.string().min(1, 'La cédula es requerida').regex(/^[0-9]+$/, 'La cédula debe contener solo números'),
  pin: z.string().length(4, 'El PIN debe ser 4 dígitos').regex(/^[0-9]{4}$/, 'El PIN debe contener solo números'),
});

type FormErrors = {
  cedula?: string;
  pin?: string;
};

export default function LoginPage() {
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success'>('error');

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});
    setToastMessage('');

    const result = loginSchema.safeParse({ cedula, pin });

    if (!result.success) {
      const fieldErrors = result.error.formErrors.fieldErrors;
      setFormErrors({
        cedula: fieldErrors.cedula?.[0],
        pin: fieldErrors.pin?.[0],
      });
      setToastType('error');
      setToastMessage('Revisa los datos e intenta de nuevo.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setToastType('success');
      setToastMessage('Ingreso exitoso. Redirigiendo...');
      // Aquí puedes agregar la lógica de autenticación real.
    } catch (error) {
      setToastType('error');
      setToastMessage('No se pudo iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-md">
        {toastMessage ? (
          <div
            className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 transform rounded-xl px-4 py-3 text-sm shadow-lg transition duration-200 ${
              toastType === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toastMessage}
          </div>
        ) : null}

        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-black/5 sm:p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8"
              >
                <path d="M4 15h16" />
                <path d="M5 15V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
                <path d="M8 15V6" />
                <path d="M16 15V6" />
                <path d="M6 19h12" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bienvenido a MenuGran</h1>
              <p className="mt-2 text-sm text-gray-500">Ingresa con tu cédula y PIN para continuar.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Cédula</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cedula}
                onChange={(event) => setCedula(event.target.value.replace(/\D/g, ''))}
                placeholder="Ingresa tu cédula"
                className={`w-full rounded-2xl border px-4 py-3 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 ${
                  formErrors.cedula ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'
                }`}
              />
              {formErrors.cedula ? (
                <p className="mt-2 text-sm text-red-600">{formErrors.cedula}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className={`w-full rounded-2xl border px-4 py-3 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 ${
                  formErrors.pin ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'
                }`}
              />
              {formErrors.pin ? (
                <p className="mt-2 text-sm text-red-600">{formErrors.pin}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary-600 px-4 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <div className="text-center">
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                ¿Olvidaste tu PIN?
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
