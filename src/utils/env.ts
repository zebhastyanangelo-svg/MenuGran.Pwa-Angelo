/**
 * Valida y obtiene las variables de entorno requeridas en runtime.
 * Lanza un error descriptivo si falta alguna variable crítica.
 */
type EnvRecord = Record<string, string | undefined>;

function getEnv(): EnvRecord {
  return (import.meta.env ?? {}) as EnvRecord;
}

/**
 * Obtiene el valor de una variable de entorno requerida.
 * Lanza un error descriptivo si la variable está ausente o vacía.
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = getEnv()[key] ?? defaultValue;

  if (value === undefined || value === '') {
    throw new EnvError(
      `[EnvError] La variable de entorno requerida '${key}' no está definida o está vacía. ` +
        `Por favor, configura '.env.local' basado en '.env.example'.`,
    );
  }

  return value;
}

/**
 * Emite una advertencia por consola si una variable de entorno opcional no está definida.
 * No interrumpe la ejecución — útil para variables que desactivan funcionalidades.
 */
export function warnIfMissing(key: string, featureName?: string): boolean {
  const env = getEnv();
  const value = env[key];

  if (value === undefined || value === '') {
    const feature = featureName ? ` para ${featureName}` : '';
    // eslint-disable-next-line no-console
    console.warn(
      `[EnvWarning] La variable '${key}'${feature} no está definida. ` +
        'Algunas funcionalidades pueden no estar disponibles.',
    );
    return false;
  }

  return true;
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export interface RuntimeEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
}

/**
 * Valida las variables públicas de entorno en runtime.
 * Las variables de Supabase son obligatorias; las de Cloudinary son opcionales
 * (se emiten advertencias si faltan).
 */
export function validateRuntimeEnv(): RuntimeEnv {
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  const cloudinaryCloudName = getEnv()['VITE_CLOUDINARY_CLOUD_NAME'];
  const cloudinaryUploadPreset = getEnv()['VITE_CLOUDINARY_UPLOAD_PRESET'];

  if (cloudinaryCloudName === undefined || cloudinaryCloudName === '') {
    warnIfMissing('VITE_CLOUDINARY_CLOUD_NAME', 'subida de imágenes');
  }
  if (cloudinaryUploadPreset === undefined || cloudinaryUploadPreset === '') {
    warnIfMissing('VITE_CLOUDINARY_UPLOAD_PRESET', 'subida de imágenes');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    cloudinaryCloudName:
      cloudinaryCloudName && cloudinaryCloudName !== '' ? cloudinaryCloudName : undefined,
    cloudinaryUploadPreset:
      cloudinaryUploadPreset && cloudinaryUploadPreset !== '' ? cloudinaryUploadPreset : undefined,
  };
}
