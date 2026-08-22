/**
 * Utilidades para el registro de comercios desde el panel de Super Admin.
 * Cada función tiene una única responsabilidad y es testeable de forma aislada.
 */

export interface CreateMerchantAccountInput {
  ownerFullName: string;
  ownerCi: string;
  ownerPhone: string;
  ownerEmail: string;
  businessName: string;
  businessRif: string;
}

export interface CreateMerchantAccountResult {
  userId: string;
  merchantId: string;
  temporaryPassword: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Convierte un nombre de negocio en slug URL-safe (minúsculas, sin acentos). */
export function slugifyMerchantName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'comercio' : slug;
}

/** Genera una contraseña temporal aleatoria para las credenciales iniciales. */
export function generateTemporaryPassword(length = 16): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let password = '';
  for (let index = 0; index < length; index += 1) {
    password += alphabet[randomValues[index] % alphabet.length];
  }
  return password;
}

/**
 * Valida el formulario de creación de comercio.
 * Devuelve `null` si todo es válido; en caso contrario el mensaje de error.
 */
export function validateCreateMerchantInput(
  input: CreateMerchantAccountInput,
): string | null {
  if (input.ownerFullName.trim() === '') {
    return 'El nombre del propietario es obligatorio.';
  }
  if (input.ownerCi.trim() === '') {
    return 'La C.I. del propietario es obligatoria.';
  }
  if (input.ownerPhone.trim() === '') {
    return 'El teléfono del propietario es obligatorio.';
  }
  if (!EMAIL_PATTERN.test(input.ownerEmail.trim())) {
    return 'Ingresa un email válido para el propietario.';
  }
  if (input.businessName.trim() === '') {
    return 'El nombre del negocio es obligatorio.';
  }
  if (input.businessRif.trim() === '') {
    return 'El RIF del negocio es obligatorio.';
  }
  return null;
}
