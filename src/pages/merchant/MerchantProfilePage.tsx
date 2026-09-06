import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut, Mail, ShieldCheck, Store, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { MerchantContext } from '../../services/merchantStaffService';
import { getMerchantContext } from '../../services/merchantStaffService';
import { updateAuthPassword } from '../../services/superAdminMetricsService';
import {
  validatePasswordChange,
  type PasswordChangeInput,
} from '../../utils/passwordChange';
import { NoMerchantWarning } from '../../components/merchant/NoMerchantWarning';

export function MerchantProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [context, setContext] = useState<MerchantContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState<PasswordChangeInput>({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFeedback, setPasswordFeedback] = useState<{
    kind: 'ok' | 'error';
    message: string;
  } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user === null) return;
    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      try {
        const merchantContext = await getMerchantContext(user.id);
        if (cancelled) return;
        setContext(merchantContext);
        if (!cancelled) setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'No se pudo cargar el perfil del comercio.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePasswordField = useCallback(
    (field: keyof PasswordChangeInput, value: string): void => {
      setPasswords((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const validationError = validatePasswordChange(passwords);
    if (validationError !== null) {
      setPasswordFeedback({ kind: 'error', message: validationError });
      return;
    }
    setIsSavingPassword(true);
    setPasswordFeedback(null);
    try {
      await updateAuthPassword(passwords.newPassword);
      setPasswordFeedback({
        kind: 'ok',
        message: 'Contraseña actualizada correctamente.',
      });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (caught) {
      setPasswordFeedback({
        kind: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No se pudo actualizar la contraseña.',
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

  if (isLoading) {
    return (
      <div
        className="py-8 text-center text-gray-500 font-medium"
        role="status"
      >
        Cargando perfil del comercio...
      </div>
    );
  }

  if (error !== null && context === null) {
    return (
      <div
        className="p-4 bg-red-50 border border-red-200 rounded text-red-700"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (context === null) {
    return <NoMerchantWarning />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            <UserCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-[0.12em] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-red" aria-hidden="true" />
              {context.isOwner ? 'Dueño de Comercio' : 'Empleado'}
            </p>
            <h1
              className="text-2xl font-bold text-slate-900"
              data-testid="profile-name"
            >
              {profile?.full_name ?? user?.email ?? 'Comercio'}
            </h1>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <UserCircle2 className="h-4 w-4" aria-hidden="true" />
              Nombre
            </div>
            <p className="text-base font-semibold text-slate-900">
              {profile?.full_name ?? user?.email ?? 'Sin nombre'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Correo
            </div>
            <p
              className="text-base font-semibold text-slate-900"
              data-testid="profile-email"
            >
              {profile?.email ?? user?.email ?? 'Sin correo asociado'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Store className="h-4 w-4" aria-hidden="true" />
              Comercio
            </div>
            <p className="text-base font-semibold text-slate-900">
              {context.merchantName ?? 'Sin comercio asociado'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Rol
            </div>
            <p
              className="text-base font-semibold text-slate-900"
              data-testid="profile-role"
            >
              {context.isOwner ? 'Dueño de Comercio' : 'Empleado'}
            </p>
          </div>
        </div>
      </div>

      {context.isOwner && (
        <form
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
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
            onChange={(event) =>
              updatePasswordField('newPassword', event.target.value)
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmar nueva contraseña"
            autoComplete="new-password"
            value={passwords.confirmPassword}
            onChange={(event) =>
              updatePasswordField('confirmPassword', event.target.value)
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
          {passwordFeedback !== null && (
            <p
              role={passwordFeedback.kind === 'error' ? 'alert' : 'status'}
              data-testid="password-feedback"
              className={`rounded-xl px-3 py-2 text-sm ${
                passwordFeedback.kind === 'error'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {passwordFeedback.message}
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
      )}

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        data-testid="merchant-logout"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </div>
  );
}

export default MerchantProfilePage;
