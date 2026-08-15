import { compressImage } from '../utils/imageCompressor';

export interface UploadToImgBBOptions {
  apiKey?: string;
  compress?: boolean;
}

export interface ImgBBUploadResponse {
  success?: boolean;
  status?: number;
  data?: {
    url?: string;
    display_url?: string;
    id?: string;
    title?: string;
  };
  error?: {
    message?: string;
    code?: string;
  };
  error_code?: string;
  error_message?: string;
}

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

/**
 * Obtiene la API key de ImgBB, preferiendo el override de `options.apiKey`
 * y cayendo al fallback de variable de entorno `VITE_IMGBB_API_KEY`.
 */
function resolveApiKey(options?: UploadToImgBBOptions): string | undefined {
  const fromOption = options?.apiKey;
  if (fromOption !== undefined && fromOption !== '') {
    return fromOption;
  }
  const fromEnv = import.meta.env.VITE_IMGBB_API_KEY;
  if (fromEnv === undefined || fromEnv === '') {
    return undefined;
  }
  return fromEnv;
}

/**
 * Sube una imagen a ImgBB y devuelve la URL directa de la imagen publicada.
 *
 * Se recomienda para fotos públicas de perfil de comercios y platillos del menú,
 * manteniendo Supabase Storage exclusivamente para comprobantes de pago.
 *
 * Opcionalmente comprime la imagen en el cliente (reutiliza `compressImage`)
 * para reducir el payload antes de la subida; si la compresión falla se
 * envía el archivo original.
 *
 * @throws {Error} si la API key falta, la red falla o la API responde con error.
 */
export async function uploadToImgBB(
  file: File | Blob,
  options?: UploadToImgBBOptions,
): Promise<string> {
  const apiKey = resolveApiKey(options);

  if (!apiKey) {
    throw new Error(
      'La API key de ImgBB no está configurada. Define VITE_IMGBB_API_KEY.',
    );
  }

  let blobToUpload: Blob = file;

  if (options?.compress !== false) {
    try {
      const compressed = await compressImage(file);
      blobToUpload = compressed.blob;
    } catch {
      // Si la compresión falla (ej. ambiente de prueba sin Canvas), usar archivo original
      blobToUpload = file;
    }
  }

  const formData = new FormData();
  formData.append('image', blobToUpload);

  const endpoint = `${IMGBB_ENDPOINT}?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data: ImgBBUploadResponse = await response.json();

    if (!response.ok || data.success === false) {
      const message =
        data.error?.message || data.error_message || `Error en la subida a ImgBB (${response.status})`;
      throw new Error(message);
    }

    const uploadedUrl = data.data?.display_url ?? data.data?.url;
    if (!uploadedUrl) {
      throw new Error(
        'Respuesta inválida de ImgBB: falta URL de la imagen.',
      );
    }

    return uploadedUrl;
  } catch (err: unknown) {
    // TypeError indica un fallo de transporte (fetch rechazado, CORS, DNS...)
    // que no aporta un mensaje útil al usuario.
    if (err instanceof TypeError) {
      throw new Error('Error al subir la imagen a ImgBB.');
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Error al subir la imagen a ImgBB.');
  }
}
