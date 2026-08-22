import { useState, type FormEvent } from 'react';
import { KeyRound, LogOut, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { updateAuthPassword } from '../../services/superAdminMetricsService';
import {
  validatePasswordChange,
  type PasswordChangeInput,
} from '../../utils/passwordChange';

/** Vista de perfil exclusiva para el rol superadmin. */
export function SuperAdminProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [passwords, setPasswords] = useState<PasswordChangeInput>({
    newPassword: '',
    confirmPassword: '',
  });
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const displayName = profile?.full_name ?? user?.email ?? 'Super Admin';
  const email = profile?.email ?? user?.email ?? 'Sin correo asociado';

  function updateField(field: keyof PasswordChangeInput, value: string): void {
    setPasswords((previous) => ({ ...previous, [field]: value }));
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationError = validatePasswordChange(passwords);
    if (validationError !== null) {
      setFeedback({ kind: 'error', message: validationError });
      return;
    }
    setIsSavingPassword(true);
    setFeedback(null);
    try {
      await updateAuthPassword(passwords.newPassword);
      setFeedback({ kind: 'ok', message: 'Contraseña actualizada correctamente.' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (caught) {
      setFeedback({
        kind: 'error',
        message: caught instanceof Error ? caught.message : 'No se pudo actualizar la contraseña.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl pt-4 md:pt-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            <UserCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-[0.12em] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-red" aria-hidden="true" />
              Super Admin
            </p>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="profile-name">
              {displayName}
            </h1>
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
            <p className="text-base font-semibold text-slate-900" data-testid="profile-email">
              {email}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Rol
            </div>
            <p className="text-base font-semibold text-slate-900">Super Admin</p>
          </div>
        </div>
      </div>

      <form
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 space-y-4"
        aria-label="Formulario de cambio de contraseña"
        noValidate
        onSubmit={(event) => void handlePasswordChange(event)}
      >
        <legend className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-brand-red" aria-hidden="true" />
          Cambiar contraseña
        </legend>
        <input
          type="password"
          name="newPassword"
          placeholder="Nueva contraseña (mínimo 8 caracteres)"
          autoComplete="new-password"
          value={passwords.newPassword}
          onChange={(event) => updateField('newPassword', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirmar nueva contraseña"
          autoComplete="new-password"
          value={passwords.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        {feedback !== null && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            data-testid="password-feedback"
            className={`rounded-xl px-3 py-2 text-sm ${
              feedback.kind === 'error'
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {feedback.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSavingPassword}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-red px-4 text-sm font-medium text-white transition hover:bg-[#c80024] disabled:pointer-events-none disabled:opacity-50"
        >
          {isSavingPassword ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        data-testid="superadmin-logout"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Cerrar Sesión
      </button>
    </section>
  );
}

export default SuperAdminProfilePage;
