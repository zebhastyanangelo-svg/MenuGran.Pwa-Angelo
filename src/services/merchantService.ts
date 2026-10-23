import { supabase } from './supabase';
import {
  deletePublicImageFromUrl,
  uploadPublicImage,
  type PublicImageUpload,
} from './storageService';
import { normalizeImageUrl } from '../utils/imageUrl';
import type { MerchantRow } from '../types/database';
import type { MerchantUpdate } from '../types/database';
import type { MerchantCategory, ServiceModality, BusinessHours } from '../types/database';

export interface LogoBannerUploadResult {
  logo_url: string | null;
  banner_url: string | null;
}

export interface CreateMerchantPayload {
  name: string;
  slug: string;
  rif: string;
  category: MerchantCategory;
  description: string | null;
  address: string;
  phone_whatsapp: string;
  service_modalities: ServiceModality;
  business_hours: BusinessHours;
  opening_time?: string | null;
  closing_time?: string | null;
  logo_file?: File | null;
  banner_file?: File | null;
  logo_url?: string | null;
  banner_url?: string | null;
}

/**
 * Sanitiza una URL de imagen antes de persistirla en la base de datos:
 * solo se guardan URLs web válidas (`http://` / `https://`). Valores vacíos,
 * nulos o efímeros (objetos `blob:`, `data:`) se normalizan a `null` para
 * que las vistas de clientes móviles y PWA — que siempre renderizan los
 * datos frescos de la base — apliquen el fallback limpio en lugar de una
 * imagen rota que solo funciona en la sesión de origen.
 */
export function sanitizeImageUrl(
  rawUrl: string | null | undefined,
): string | null {
  return normalizeImageUrl(rawUrl);
}

/**
 * Aplica `sanitizeImageUrl` a las claves de imagen (logo/banner) de un
 * objeto de actualización, sin tocar el resto de los campos. Las claves
 * ausentes se mantienen ausentes para que Supabase no las altere.
 *
 * Acepta `MerchantUpdate` (y no solo `Partial<MerchantRow>`) porque el
 * formulario de ajustes puede enviar `location` como POINT en texto; el
 * tipo devuelto conserva esa forma original.
 */
export function sanitizeMerchantImageUpdates(
  updates: MerchantUpdate,
): MerchantUpdate {
  const sanitized: MerchantUpdate = { ...updates };
  if ('logo_url' in updates) {
    sanitized.logo_url = sanitizeImageUrl(updates.logo_url);
  }
  if ('banner_url' in updates) {
    sanitized.banner_url = sanitizeImageUrl(updates.banner_url);
  }
  return sanitized;
}

/**
 * Id del comercio generado en el cliente. La columna usa `gen_random_uuid()`
 * (UUIDv4), el mismo formato que `crypto.randomUUID()`, así que el id se
 * resuelve antes del INSERT para poder subir logo y banner a la carpeta
 * definitiva `merchants/<id>/...` sin archivos temporales que mover después.
 */
function generateMerchantId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID !== undefined) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function createMerchant(
  payload: CreateMerchantPayload,
): Promise<MerchantRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    throw new Error('No se pudo obtener el usuario autenticado para crear el comercio.');
  }

  const merchantId = generateMerchantId();

  let logo_url = sanitizeImageUrl(payload.logo_url);
  let banner_url = sanitizeImageUrl(payload.banner_url);
  /** Subidas de esta operación, para rollback si el INSERT falla. */
  const uploaded: PublicImageUpload[] = [];

  try {
    if (payload.logo_file) {
      const uploadedLogo = await uploadPublicImage(payload.logo_file, {
        merchantId,
        kind: 'logo',
      });
      uploaded.push(uploadedLogo);
      logo_url = uploadedLogo.url;
    }

    if (payload.banner_file) {
      const uploadedBanner = await uploadPublicImage(payload.banner_file, {
        merchantId,
        kind: 'banner',
      });
      uploaded.push(uploadedBanner);
      banner_url = uploadedBanner.url;
    }

    const { data, error } = await supabase
      .from('merchants')
      .insert({
        id: merchantId,
        owner_id: user.id,
        name: payload.name,
        slug: payload.slug,
        rif: payload.rif,
        category: payload.category,
        description: payload.description,
        address: payload.address,
        phone_whatsapp: payload.phone_whatsapp,
        service_modalities: payload.service_modalities,
        business_hours: payload.business_hours,
        opening_time: payload.opening_time ?? null,
        closing_time: payload.closing_time ?? null,
        logo_url,
        banner_url,
        status: 'pending_approval',
        is_active: false,
      } as Partial<MerchantRow>)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Error al crear el merchant: ${error.message}`,
      );
    }

    return data as MerchantRow;
  } catch (err: unknown) {
    // Rollback de las subidas: sin fila de comercio que las referencie,
    // los archivos quedarían huérfanos en el bucket público.
    for (const upload of uploaded) {
      void deletePublicImageFromUrl(upload.url);
    }
    throw err;
  }
}

export async function updateMerchant(
  id: string,
  updates: Partial<MerchantRow>,
): Promise<MerchantRow> {
  const { data, error } = await supabase
    .from('merchants')
    .update(sanitizeMerchantImageUpdates(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error al actualizar el merchant: ${error.message}`,
    );
  }

  return data as MerchantRow;
}