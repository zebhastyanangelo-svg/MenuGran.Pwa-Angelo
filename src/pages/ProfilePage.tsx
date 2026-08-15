import { useState } from 'react';
import { LogOut, Mail, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Cliente';
  const email = user?.email ?? 'Sin correo asociado';

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

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <UserCircle2 className="h-4 w-4" aria-hidden="true" />
              Nombre
            </div>
            <p className="text-base font-semibold text-slate-900">{displayName}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Correo
            </div>
            <p className="text-base font-semibold text-slate-900">{email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </section>
  );
}
