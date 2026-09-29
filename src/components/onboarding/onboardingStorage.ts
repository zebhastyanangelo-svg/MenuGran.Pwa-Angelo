/**
 * Persistencia local de la marca de onboarding completado.
 * Módulo separado del componente para no romper el fast-refresh de React.
 */

export const ONBOARDING_COMPLETED_KEY = 'menugram_onboarding_completed';

/** Indica si el usuario ya completó el onboarding según localStorage. */
export function isOnboardingCompleted(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Marca el onboarding como completado en localStorage. */
export function markOnboardingCompleted(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch {
    // Ignorar errores de localStorage (modo privado, cuota, etc.)
  }
}
