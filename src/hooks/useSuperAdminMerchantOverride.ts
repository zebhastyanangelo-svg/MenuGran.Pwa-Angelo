import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';

/** Parámetro de query con el que el panel de Superadmin fija un comercio. */
export const SUPERADMIN_MERCHANT_PARAM = 'merchant_id';

export interface UseSuperAdminMerchantOverrideResult {
  /**
   * Id del comercio fijado por el Superadmin en la URL
   * (`?merchant_id=...`), o `null` si no hay override válido.
   */
  merchantId: string | null;
  /** `true` cuando la sesión actual es un Superadmin con override activo. */
  isActive: boolean;
}

/**
 * Acceso transparente del Superadmin al panel de un comercio.
 *
 * El panel de Superadmin enlaza las páginas de gestión con
 * `?merchant_id=<id>`; este hook valida que quien navega realmente sea un
 * superadmin y expone el id para que cada página lo use como contexto de
 * comercio. Para cualquier otro rol el override se ignora por completo y las
 * páginas resuelven su propio comercio (dueño o empleado).
 */
export function useSuperAdminMerchantOverride(): UseSuperAdminMerchantOverrideResult {
  const { profile } = useAuth();

  let rawMerchantId: string;
  try {
    const [searchParams] = useSearchParams();
    rawMerchantId = searchParams.get(SUPERADMIN_MERCHANT_PARAM)?.trim() ?? '';
  } catch {
    // Montajes fuera de un <Router> (pruebas unitarias aisladas) hacen que
    // `useSearchParams` lance; se degrada a la lectura nativa del query
    // string para no romper el render. Con Router presente nunca entra aquí.
    rawMerchantId = readMerchantIdFromLocation();
  }

  const isSuperAdmin = profile?.role === 'superadmin';
  const merchantId = isSuperAdmin && rawMerchantId !== '' ? rawMerchantId : null;

  return { merchantId, isActive: merchantId !== null };
}

/**
 * Lee `?merchant_id=` directamente de `window.location.search` como fallback
 * seguro cuando no hay contexto de Router disponible.
 */
function readMerchantIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(SUPERADMIN_MERCHANT_PARAM)?.trim() ?? '';
  } catch {
    return '';
  }
}
