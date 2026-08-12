import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/database';

type AuthTab = 'login' | 'register';

interface AuthFormProps {
  defaultTab?: AuthTab;
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  merchant_owner: 'Comercio (Owner)',
  merchant_staff: 'Personal de Comercio',
  driver: 'Repartidor',
  customer: 'Cliente',
};

const REGISTER_ROLES: readonly UserRole[] = ['customer', 'merchant_owner'];

const SUBMIT_BASE_CLASS =
  'w-full rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50';

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

/**
 * Formulario de autenticación con pestañas para alternar entre
 * Iniciar Sesión y Registrarse.
 */
export function AuthForm({ defaultTab = 'login' }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithPassword, signUpWithPassword } = useAuth();

  const from = searchParams.get('from') ?? '/marketplace';

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setError(null);
    navigate(tab === 'login' ? '/login' : '/register', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      await signInWithPassword(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(resolveAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('full_name') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
    try {
      await signUpWithPassword(email, password, fullName, role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(resolveAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={
            'flex-1 py-3 text-center text-sm font-medium transition-colors' +
            (activeTab === 'login'
              ? ' border-indigo-500 text-indigo-600'
              : ' border-transparent text-gray-500 hover:text-gray-700')
          }
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('register')}
          className={
            'flex-1 py-3 text-center text-sm font-medium transition-colors' +
            (activeTab === 'register'
              ? ' border-indigo-500 text-indigo-600'
              : ' border-transparent text-gray-500 hover:text-gray-700')
          }
        >
          Registrarse
        </button>
      </div>

      {error !== null && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-2">
            Iniciar Sesión
          </h2>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            data-testid="login-submit"
            disabled={isLoading}
            className={SUBMIT_BASE_CLASS}
          >
            {isLoading ? (
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
          <h2 className="text-center text-xl font-bold text-gray-900 mb-2">
            Registrarse
          </h2>
          <div>
            <label htmlFor="register-full_name" className="block text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              id="register-full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="register-role" className="block text-sm font-medium text-gray-700">
              Tipo de cuenta
            </label>
            <select
              id="register-role"
              name="role"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {REGISTER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            data-testid="register-submit"
            disabled={isLoading}
            className={SUBMIT_BASE_CLASS}
          >
            {isLoading ? (
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
