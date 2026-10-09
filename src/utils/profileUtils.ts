export interface ProfileLike {
  phone?: string | null;
  ci?: string | null;
}

/** Campos obligatorios del perfil para poder pedir, con su etiqueta visible. */
export const REQUIRED_PROFILE_FIELDS = [
  { key: 'phone', label: 'Teléfono' },
  { key: 'ci', label: 'Cédula de Identidad' },
] as const;

export function isProfileIncomplete(profile: ProfileLike | null): boolean {
  if (profile === null) return false;
  return !profile.phone || !profile.ci;
}

/**
 * Etiquetas de los campos obligatorios que faltan en el perfil.
 *
 * Se usa para explicarle al usuario exactamente qué debe completar en vez de
 * un aviso genérico. Un perfil `null` (sin cargar / invitado) no bloquea.
 */
export function getMissingProfileFields(profile: ProfileLike | null): string[] {
  if (profile === null) return [];
  const missing: string[] = [];
  if (!profile.phone) missing.push('Teléfono');
  if (!profile.ci) missing.push('Cédula de Identidad');
  return missing;
}
