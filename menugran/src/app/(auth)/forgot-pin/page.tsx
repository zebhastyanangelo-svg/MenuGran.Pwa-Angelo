'use client';

import { useState } from 'react';
import { Key, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPinPage() {
  const [cedula, setCedula] = useState('');
  const [step, setStep] = useState<'cedula' | 'result'>('cedula');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cedula.trim()) {
      setError('Ingresa tu cedula');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'No se encontro una cuenta con esa cedula');
        setLoading(false);
        return;
      }

      setPhone(data.phone);
      setStep('result');
    } catch {
      setError('Error de conexion');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="bg-white shadow-elevated rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-2xl mb-4">
            <Key className="h-8 w-8 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Recuperar PIN</h1>
          <p className="text-neutral-500 mt-1">
            {step === 'cedula' && 'Ingresa tu cedula para verificar tu cuenta'}
            {step === 'result' && 'Cuenta verificada'}
          </p>
        </div>

        {step === 'cedula' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Cedula</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                className="input"
                placeholder="Ingresa tu cedula"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-md w-full"
            >
              {loading ? 'Buscando...' : 'Buscar cuenta'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-brand-500 hover:text-brand-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Volver al inicio de sesion
            </Link>
          </form>
        )}

        {step === 'result' && (
          <div className="space-y-5">
            <div className="bg-cream-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-ink">
                Hemos verificado que la cuenta existe. El telefono registrado termina en:
              </p>
              <p className="text-lg font-bold text-ink tracking-widest">{phone}</p>
              <p className="text-xs text-neutral-500">
                Contacta al administrador de tu negocio para resetear tu PIN de forma segura. Por seguridad no se muestran PINs desde la web publica.
              </p>
            </div>

            <Link
              href="/login"
              className="btn-primary btn-md w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir al inicio de sesion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}