/**
 * Compresión de imágenes para保留 comprobantes de Pago Móvil por debajo
 * del límite de 150 KB impuesto por el bucket privado de Supabase Storage.
 *
 * Estrategia: sin dependencias externas — usa la Canvas API del navegador.
 *  1. Decodifica el archivo entrante en un `HTMLImageElement`.
 *  2. Comprime iterativamente el lienzo a JPEG con calidad descendente.
 *  3. Si la calidad mínima (0.5) no basta, reduce dimensiones (escala 0.8)
 *     y reinicia el ciclo de calidad.
 *  4. Devuelve un `Blob` (que cumple `Blob & { type }`) siempre <= 150 KB.
 *
 * Cota superior: PAYMENT_PROOF_MAX_BYTES = 150 * 1024 = 153600 bytes.
 */

export const PAYMENT_PROOF_MAX_BYTES = 150 * 1024;

/** Tamaño de bloque aceptado por Supabase Storage para subidas en una sola parte. */
const MIN_QUALITY = 0.5;
const MIN_SCALE = 0.3;
const SCALE_STEP = 0.8;
const INITIAL_QUALITY = 0.92;

export interface CompressedImage {
  blob: Blob;
  /** Tamaño en bytes del blob comprimido. */
  size: number;
  /** Ancho en píxeles del lienzo que produjo el blob. */
  width: number;
  /** Alto en píxeles del lienzo que produjo el blob. */
  height: number;
  /** MIME type del blob (siempre `image/jpeg` por la compresión con pérdida). */
  type: 'image/jpeg';
}

/**
 * Lee un `File`/`Blob` de imagen y devuelve un `HTMLImageElement` descargado.
 * Falla explícitamente (reject) si el archivo no es una imagen decodificable.
 */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo decodificar la imagen del comprobante.'));
    };
    img.src = url;
  });
}

/**
 * Pinta `source` en un canvas escalado por `scale` y devuelve el Blob JPEG a `quality`.
 */
function canvasToBlob(
  source: HTMLImageElement,
  scale: number,
  quality: number,
): Promise<Blob> {
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return Promise.reject(
      new Error('No se pudo obtener el contexto 2D del canvas.'),
    );
  }
  // Fondo blanco para evitar artefactos con transparencias que JPEG no soporta.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('toBlob devolvió null — formato no soportado.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Comprime `file` (imagen) garantizando que el blob resultante sea <= 150 KB.
 *
 * @throws {Error} si la imagen no se puede decodificar o ningún canvas/toBlob está disponible.
 */
export async function compressImage(
  file: Blob,
  maxBytes: number = PAYMENT_PROOF_MAX_BYTES,
): Promise<CompressedImage> {
  if (file.size === 0) {
    throw new Error('El archivo de imagen está vacío.');
  }

  const img = await loadImage(file);

  let scale = 1;
  let lastBlob: Blob | null = null;
  let lastWidth = img.naturalWidth;
  let lastHeight = img.naturalHeight;

  while (scale >= MIN_SCALE) {
    let quality = INITIAL_QUALITY;
    while (quality >= MIN_QUALITY) {
      const blob = await canvasToBlob(img, scale, quality);
      lastBlob = blob;
      lastWidth = Math.max(1, Math.round(img.naturalWidth * scale));
      lastHeight = Math.max(1, Math.round(img.naturalHeight * scale));
      if (blob.size <= maxBytes) {
        return {
          blob,
          size: blob.size,
          width: lastWidth,
          height: lastHeight,
          type: 'image/jpeg',
        };
      }
      quality -= 0.1;
    }
    scale *= SCALE_STEP;
  }

  // No cumplimos el límite: devolvemos la mejor compresión alcanzada.
  if (lastBlob === null) {
    throw new Error('No se pudo comprimir la imagen.');
  }
  return {
    blob: lastBlob,
    size: lastBlob.size,
    width: lastWidth,
    height: lastHeight,
    type: 'image/jpeg',
  };
}

/**
 * Genera un nombre de archivo único para el comprobante en el bucket de Storage.
 * Usa crypto.getRandomValues si está disponible, con fallback a Math.random.
 */
export function buildProofFileName(orderId: string): string {
  const randomBytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues !== undefined) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const randomHex = Array.from(randomBytes, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return `${orderId}/${randomHex}.jpg`;
}

/**
 * Generates a temporary proof filename that does not depend on orderId.
 * Used to upload the proof BEFORE the order is created, so the URL can be
 * included in the initial INSERT.
 */
export function buildTempProofFileName(): string {
  const randomBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues !== undefined) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const randomHex = Array.from(randomBytes, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return `tmp/${randomHex}.jpg`;
}
