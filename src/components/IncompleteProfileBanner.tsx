import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Evalúa si el perfil del usuario tiene datos obligatorios faltantes.
 * Retorna `true` cuando falta `phone` o `ci` (cédula de identidad).
 */
export function isProfileIncomplete(
  profile: { phone?: string | null; ci?: string | null } | null,
): boolean {
  if (profile === null) return false;
  return !profile.phone || !profile.ci;
}

export function IncompleteProfileBanner() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role !== 'customer') return null;
  if (!isProfileIncomplete(profile)) return null;

  return (
    <div
      role="alert"
      className="mx-4 mt-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">Tu perfil está incompleto</p>
        <p className="mt-1">
          Para completar tu cuenta y gestionar tu pedido, por favor completa tu Cédula de Identidad y Teléfono.
        </p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
        >
          Completar perfil
        </button>
      </div>
    </div>
  );
}
