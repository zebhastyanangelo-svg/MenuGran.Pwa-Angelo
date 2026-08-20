import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { suggestEmailDomain } from '../../utils/emailSuggestions';

type AuthTab = 'login' | 'register';

interface AuthFormProps {
  defaultTab?: AuthTab;
}

/* Role labels and roles kept for reference but the role select
   was removed per the new auth flow - registration is now exclusively
   for customers. The "Cliente" / "Comercio" tabs at the top have been
   removed; only customer registration is available. */

const SUBMIT_BASE_CLASS =
  'w-full rounded-xl border border-transparent bg-brand-red py-3 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

const GOOGLE_BUTTON_CLASS =
  'flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

/**
 * Logo oficial de Google en SVG (colores de marca).
 */
function GoogleLogo() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-testid="google-logo"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

/**
 * Traduce el error de Supabase a un mensaje legible para el usuario.
 */
function resolveAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
      return 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
    }
    if (message.includes('invalid') || message.includes('credentials') || message.includes('password')) {
      return 'Las credenciales son incorrectas. Verifica tu correo y contraseña.';
    }
    if (message.includes('email') && message.includes('not validated')) {
      return 'Revisa tu bandeja de entrada para confirmar tu correo electrónico.';
    }
    return error.message;
  }
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

function isUnconfirmedEmailError(error: unknown): boolean {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    return (error as { code: unknown }).code === 'email_not_confirmed';
  }
  return false;
}

/**
 * Formulario de autenticación con pestañas para alternar entre
 * Iniciar Sesión y Registrarse.
 */
export function AuthForm({ defaultTab = 'login' }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithPassword, signUpWithPassword, resendConfirmationEmail, signInWithGoogle } =
    useAuth();

  const from = searchParams.get('from') ?? '/marketplace';

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setError(null);
    setShowConfirmationBanner(false);
    setPendingEmail('');
    navigate(tab === 'login' ? '/login' : '/register', { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setShowConfirmationBanner(false);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(resolveAuthErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEmailLoading(true);
    setError(null);
    setShowConfirmationBanner(false);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      await signInWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (isUnconfirmedEmailError(err)) {
        setPendingEmail(email);
        setError(
          'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.',
        );
      } else {
        setError(resolveAuthErrorMessage(err));
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEmailLoading(true);
    setError(null);
    setShowConfirmationBanner(false);
    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('full_name') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const role = 'customer';

    const suggestion = suggestEmailDomain(email);
    if (suggestion !== null) {
      setError(
        `¿Quisiste decir '${suggestion.suggestion}'? Corrige tu correo e inténtalo de nuevo.`,
      );
      setIsEmailLoading(false);
      return;
    }

    try {
      const result = await signUpWithPassword(email, password, fullName, role);
      if (result.needsEmailConfirmation) {
        setPendingEmail(email);
        setShowConfirmationBanner(true);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(resolveAuthErrorMessage(err));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (pendingEmail === '') return;
    setIsEmailLoading(true);
    setError(null);
    try {
      await resendConfirmationEmail(pendingEmail);
      setError(null);
    } catch (err) {
      setError(resolveAuthErrorMessage(err));
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        data-testid="google-signin"
        onClick={() => void handleGoogleSignIn()}
        disabled={isGoogleLoading}
        className={GOOGLE_BUTTON_CLASS}
      >
        {isGoogleLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Conectando con Google...
          </span>
        ) : (
          <>
            <GoogleLogo />
            Continuar con Google
          </>
        )}
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-300" />
        <span className="text-sm text-gray-500">o ingresa con tu correo</span>
        <span className="h-px flex-1 bg-gray-300" />
      </div>

      <div className="mb-6 flex overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={
            'flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-colors ' +
            (activeTab === 'login'
              ? 'bg-brand-red text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900')
          }
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('register')}
          className={
            'flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition-colors ' +
            (activeTab === 'register'
              ? 'bg-brand-red text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900')
          }
        >
          Registrarse
        </button>
      </div>

      {showConfirmationBanner && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p className="font-semibold">¡Registro exitoso!</p>
          <p className="mt-1">
            Te enviamos un correo de confirmación a <strong>{pendingEmail}</strong>.
            Revisa tu bandeja de entrada para activar tu cuenta.
          </p>
        </div>
      )}

      {error !== null && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
          {pendingEmail !== '' && (
            <button
              type="button"
              data-testid="resend-confirmation"
              onClick={handleResendConfirmation}
              disabled={isEmailLoading}
              className="ml-2 underline disabled:opacity-50"
            >
              {isEmailLoading ? 'Reenviando...' : 'Reenviar email de confirmación'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="mb-2 text-center text-xl font-bold text-slate-900">
            Iniciar Sesión
          </h2>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            data-testid="login-submit"
            disabled={isEmailLoading}
            className={SUBMIT_BASE_CLASS}
          >
            {isEmailLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      )}

{activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <h2 className="mb-2 text-center text-xl font-bold text-slate-900">
            Registrarse
          </h2>

          <div>
            <div>
              <label htmlFor="register-full_name" className="block text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                id="register-full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <div>
              <label htmlFor="register-ci" className="block text-sm font-medium text-slate-700">
                C.I. (Cédula de Identidad)
              </label>
              <input
                id="register-ci"
                name="ci"
                type="text"
                required
                autoComplete="name"
                maxLength={20}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
                placeholder="Ej: V-12345678"
              />
            </div>
            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                maxLength={15}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100 sm:text-sm"
                placeholder="Ej: +58 412-123-4567"
                pattern="[0-9\s+\-]+"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-300">
            <p className="text-sm text-slate-700 font-medium">
              ¿Quieres vender tu comida en MenuGran? Contacta al equipo de soporte para dar de alta tu negocio
            </p>
            <a
              href="https://wa.me/58414xxxxxxx"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-brand-red underline text-sm font-medium"
            >
              WhatsApp
            </a>
          </div>

          <button
            type="submit"
            data-testid="register-submit"
            disabled={isEmailLoading}
            className={SUBMIT_BASE_CLASS}
          >
            {isEmailLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </span>
            ) : (
              'Registrarse'
            )}
          </button>
        </form>
      )}



    </div>
  );
}