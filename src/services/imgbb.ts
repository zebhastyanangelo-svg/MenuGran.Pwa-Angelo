import { compressImage } from '../utils/imageCompressor';
import { isImgbbViewerUrl, normalizeImageUrl } from '../utils/imageUrl';

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
    image?: { url?: string };
    thumb?: { url?: string };
    medium?: { url?: string };
  };
  error?: {
    message?: string;
    code?: string;
  };
  error_code?: string;
  error_message?: string;
}

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

const IMGBB_FALLBACK_KEY = '85de5bb4a57df79ff01ea99cc13f8f03';

/**
 * Obtiene la API key de ImgBB, preferiendo el override de `options.apiKey`,
 * cayendo a la variable de entorno `VITE_IMGBB_API_KEY` y, como último
 * recurso, usando un fallback estático para evitar errores en runtime.
 */
function resolveApiKey(options?: UploadToImgBBOptions): string {
  const fromOption = options?.apiKey;
  if (fromOption !== undefined && fromOption !== '') {
    return fromOption;
  }
  const fromEnv = import.meta.env.VITE_IMGBB_API_KEY;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv;
  }
  return IMGBB_FALLBACK_KEY;
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
 * La URL devuelta siempre es HTTPS absoluta del CDN `i.ibb.co`, compatible
 * con WebView y navegadores de PWA en dispositivos móviles; las páginas del
 * visor (`ibb.co/...`) se rechazan explícitamente para que nunca lleguen a
 * la base de datos.
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

    // ImgBB expone varias URLs en su respuesta: `display_url` es la imagen
    // directa servida desde `i.ibb.co`, mientras que `url` puede ser la
    // página HTML del visor (`ibb.co/...`) que no puede renderizarse dentro
    // de un `<img>`. Se prefieren las URLs directas de mayor calidad y el
    // resultado se normaliza a HTTPS absoluto, porque los navegadores
    // móviles (WebView / PWA) bloquean el contenido mixto `http://`.
    const rawUrl =
      data.data?.display_url ??
      data.data?.image?.url ??
      data.data?.medium?.url ??
      data.data?.thumb?.url ??
      data.data?.url;

    const uploadedUrl = normalizeImageUrl(rawUrl);

    // Nunca se persiste una página del visor (`ibb.co/<id>`): es HTML, no una
    // imagen, y dejaría el logo, banner o plato roto en el dispositivo.
    if (uploadedUrl === null || isImgbbViewerUrl(uploadedUrl)) {
      throw new Error(
        'Respuesta inválida de ImgBB: falta la URL directa de la imagen.',
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
