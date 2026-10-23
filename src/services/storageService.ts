import { supabase } from './supabase';
import { compressImage } from '../utils/imageCompressor';
import { normalizeImageUrl } from '../utils/imageUrl';

/**
 * Bucket público del catálogo: logos, banners y fotos de platos, servidos por
 * el CDN de Supabase con URLs estables y anónimas.
 */
export const PUBLIC_MEDIA_BUCKET = 'merchant-media';

/**
 * Bucket privado de comprobantes de pago. Nunca se expone públicamente: las
 * vistas lo consumen mediante URLs firmadas de corta duración.
 */
export const PAYMENT_PROOF_BUCKET = 'payment-proofs';

/** Tipos de imagen pública soportados y su carpeta dentro del bucket. */
export type PublicImageKind = 'logo' | 'banner' | 'dish';

export interface UploadPublicImageOptions {
  /** Comercio al que pertenece la imagen; define su carpeta en el bucket. */
  merchantId: string;
  kind: PublicImageKind;
  /** Comprime en el cliente antes de subir (por defecto `true`). */
  compress?: boolean;
}

export interface PublicImageUpload {
  /** URL pública absoluta lista para persistir en la base de datos. */
  url: string;
  /** Ruta del objeto dentro del bucket (`merchants/<id>/<kind>/...`). */
  path: string;
}

export interface StorageReference {
  bucket: string;
  path: string;
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Extensión de archivo a usar; por defecto jpg (formato del compresor). */
function resolveExtension(mimeType: string | undefined): string {
  if (mimeType !== undefined) {
    const mapped = MIME_EXTENSION_MAP[mimeType.toLowerCase()];
    if (mapped !== undefined) return mapped;
  }
  return 'jpg';
}

/** Sufijo aleatorio que evita colisiones y cacheos entre subidas. */
function buildRandomSuffix(): string {
  const randomBytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues !== undefined) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i += 1) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Ruta canónica de una imagen pública dentro del bucket:
 * `merchants/<merchantId>/<kind>/<marcaDeTiempo>-<aleatorio>.<ext>`.
 */
export function buildPublicImagePath(
  merchantId: string,
  kind: PublicImageKind,
  mimeType?: string,
): string {
  const safeMerchantId = merchantId.trim();
  if (safeMerchantId === '') {
    throw new Error('Se requiere el id del comercio para subir la imagen.');
  }
  const extension = resolveExtension(mimeType);
  return `merchants/${safeMerchantId}/${kind}/${Date.now()}-${buildRandomSuffix()}.${extension}`;
}

/**
 * Extrae bucket y ruta de una URL de Supabase Storage (pública, firmada o
 * autenticada) o de una referencia cruda `"<bucket>/<ruta>"`.
 *
 * Devuelve `null` si la URL no apunta a Storage: las URLs externas heredadas
 * de ImgBB no se pueden borrar físicamente y deben ignorarse.
 */
export function extractStorageReference(
  rawUrl: string | null | undefined,
): StorageReference | null {
  if (rawUrl === null || rawUrl === undefined) return null;
  const trimmed = rawUrl.trim();
  if (trimmed === '') return null;

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(
      /^\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/]+)\/(.+)$/,
    );
    if (match === null) return null;
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    const separator = trimmed.indexOf('/');
    if (separator <= 0) return null;
    return {
      bucket: trimmed.slice(0, separator),
      path: trimmed.slice(separator + 1),
    };
  }
}

/** `true` si la URL apunta a una imagen gestionada en el bucket público. */
export function isManagedPublicImageUrl(
  rawUrl: string | null | undefined,
): boolean {
  const reference = extractStorageReference(rawUrl);
  return reference !== null && reference.bucket === PUBLIC_MEDIA_BUCKET;
}

/**
 * Elimina físicamente del bucket público la imagen referenciada por la URL.
 *
 * Es una limpieza best-effort pensada para el reemplazo y la retirada de
 * logos, banners y platos: un fallo de red en el borrado no debe romper el
 * guardado del formulario, así que el error solo se registra y se devuelve
 * `false`. Las URLs que no son de este bucket (externas de ImgBB) se ignoran.
 */
export async function deletePublicImageFromUrl(
  rawUrl: string | null | undefined,
): Promise<boolean> {
  const reference = extractStorageReference(rawUrl);
  if (reference === null || reference.bucket !== PUBLIC_MEDIA_BUCKET) {
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .remove([reference.path]);
    if (error !== null) {
      console.warn(
        `No se pudo borrar '${reference.path}' de '${PUBLIC_MEDIA_BUCKET}': ${error.message}`,
      );
      return false;
    }
    return true;
  } catch (caught) {
    console.warn('Fallo al eliminar la imagen pública de Storage:', caught);
    return false;
  }
}

/**
 * Sube una imagen del catálogo al bucket público de Supabase Storage y
 * devuelve la URL pública lista para persistir.
 *
 * La imagen se comprime en el cliente (reutiliza `compressImage`); si la
 * compresión falla se sube el archivo original. La ruta se estructura por
 * comercio (`merchants/<id>/<kind>/...`) para que el borrado físico por
 * carpeta y la limpieza al eliminar un comercio sean triviales.
 *
 * @throws {Error} si falta el comercio, la subida es rechazada o la red falla.
 */
export async function uploadPublicImage(
  file: File | Blob,
  options: UploadPublicImageOptions,
): Promise<PublicImageUpload> {
  const merchantId = options.merchantId.trim();
  if (merchantId === '') {
    throw new Error('Se requiere el id del comercio para subir la imagen.');
  }

  let blobToUpload: Blob = file;
  if (options.compress !== false) {
    try {
      blobToUpload = (await compressImage(file)).blob;
    } catch {
      // Sin Canvas (ej. entorno de pruebas) se sube el archivo original.
      blobToUpload = file;
    }
  }

  const path = buildPublicImagePath(
    merchantId,
    options.kind,
    blobToUpload.type || file.type,
  );

  try {
    const { error: uploadError } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, blobToUpload, {
        contentType: blobToUpload.type || file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError !== null) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .getPublicUrl(path);

    const url = normalizeImageUrl(data.publicUrl);
    if (url === null) {
      throw new Error('No se pudo resolver la URL pública de la imagen.');
    }
    return { url, path };
  } catch (caught) {
    if (caught instanceof TypeError) {
      throw new Error('Error al subir la imagen a Supabase Storage.');
    }
    if (caught instanceof Error) {
      throw caught;
    }
    throw new Error('Error al subir la imagen a Supabase Storage.');
  }
}
