export interface PasswordChangeInput {
  newPassword: string;
  confirmPassword: string;
}

/**
 * Valida el formulario de cambio de contraseña.
 * Devuelve `null` si es válido; en caso contrario el mensaje de error.
 */
export function validatePasswordChange(
  input: PasswordChangeInput,
): string | null {
  if (input.newPassword.length < 8) {
    return 'La nueva contraseña debe tener al menos 8 caracteres.';
  }
  if (input.newPassword !== input.confirmPassword) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}
