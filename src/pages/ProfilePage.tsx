import { useState, type FormEvent } from 'react';
import { LogOut, Mail, UserCircle2, Phone, CreditCard, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfile, type ProfileUpdatePayload } from '../hooks/useUpdateProfile';

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { updateProfile, isSaving, error: saveError } = useUpdateProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [ci, setCi] = useState(profile?.ci ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const email = user?.email ?? profile?.email ?? 'Sin correo asociado';
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Cliente';

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (user === null) return;
    setSuccessMsg(null);
    try {
      const payload: ProfileUpdatePayload = {};
      if (fullName !== (profile?.full_name ?? '')) payload.full_name = fullName;
      if (ci !== (profile?.ci ?? '')) payload.ci = ci;
      if (phone !== (profile?.phone ?? '')) payload.phone = phone;

      if (Object.keys(payload).length === 0) return;

      await updateProfile(user.id, payload);
      setSuccessMsg('Perfil actualizado correctamente');
    } catch {
      // error is captured by useUpdateProfile
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl pt-4 md:pt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            <UserCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500">
              Perfil del cliente
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
          </div>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          {/* Nombre completo */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <UserCircle2 className="h-4 w-4" aria-hidden="true" />
              Nombre completo
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Tu nombre completo"
            />
          </label>

          {/* Correo (solo lectura) */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-base font-semibold text-slate-500"
            />
          </label>

          {/* Cédula de Identidad */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Cédula de Identidad (C.I.)
            </span>
            <input
              type="text"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Ej. V-12345678"
            />
          </label>

          {/* Teléfono */}
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Teléfono
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
              placeholder="Ej. +584121234567"
            />
          </label>

          {saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {saveError}
            </p>
          )}
          {successMsg && (
            <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-5 w-5" aria-hidden="true" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </section>
  );
}
