import { LogOut, Store, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface NoMerchantWarningProps {
  message?: string;
}

export function NoMerchantWarning({
  message = 'No se encontró un comercio asociado a tu cuenta.',
}: NoMerchantWarningProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <Store className="h-8 w-8 text-amber-500" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">
        Sin comercio activo
      </h2>
      <p className="mb-6 max-w-sm text-sm text-slate-500">{message}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Home className="h-4 w-4" />
          Ir al Inicio
        </button>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
