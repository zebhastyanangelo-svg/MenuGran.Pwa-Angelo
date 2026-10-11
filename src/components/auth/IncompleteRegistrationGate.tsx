import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  buildRegistrationPrefillQuery,
  isRegistrationIncomplete,
} from '../../utils/registrationGate';

/**
 * Redirige de forma obligatoria a /register cuando un usuario autenticado
 * aún no completa su registro en MenuGran (p. ej. primer login con Google
 * cuya cuenta de Supabase fue creada automáticamente por el trigger pero
 * nunca pasó por el formulario de registro).
 *
 * - En /register no interviene (es la propia vista de completar registro).
 * - Mantiene la ruta `from` y prellena correo y nombre desde la sesión.
 * - Mientras la sesión/carga está pendiente no redirigira (evita parpadeos).
 */
export function IncompleteRegistrationGate() {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (isLoading) return null;
  if (location.pathname === '/register') return null;
  if (!isRegistrationIncomplete(profile, user)) return null;
  if (user === null) return null;

  const target = `/register${buildRegistrationPrefillQuery(user, profile, searchParams)}`;
  return <Navigate to={target} replace />;
}
