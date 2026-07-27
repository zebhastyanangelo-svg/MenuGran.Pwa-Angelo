'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, Phone, CreditCard, LogOut, Save } from 'lucide-react';
import { asAppSession } from '@/lib/session-helpers';

export default function ClientProfilePage() {
  const { data: rawSession, update } = useSession();
  const session = asAppSession(rawSession);
  const user = session?.user;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user?.id, user?.name, user?.phone]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        await update();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (!user) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-neutral-200" />
          <div className="h-48 rounded-xl bg-neutral-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 animate-fade-in">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200 animate-slide-up">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold text-white shadow-soft">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Perfil</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{user.name || ''}</h1>
            <p className="mt-1 text-sm text-neutral-500">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <h2 className="mb-5 text-lg font-semibold text-ink">Información personal</h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-light">
              <User className="h-4 w-4" />
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-light">
              <Phone className="h-4 w-4" />
              Teléfono
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-light">
              <CreditCard className="h-4 w-4" />
              Cédula
            </label>
            <input
              type="text"
              value={user.cedula || ''}
              disabled
              className="input bg-neutral-50 text-neutral-400 cursor-not-allowed"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary btn-md"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="text-sm font-semibold text-success-600">¡Guardado!</span>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-soft border border-neutral-200">
        <button
          type="button"
          onClick={handleLogout}
          className="btn-danger btn-md w-full"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
