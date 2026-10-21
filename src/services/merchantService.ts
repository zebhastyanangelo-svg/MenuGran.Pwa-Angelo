import { supabase } from './supabase';
import { uploadToImgBB } from './imgbb';
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

export async function createMerchant(
  payload: CreateMerchantPayload,
): Promise<MerchantRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    throw new Error('No se pudo obtener el usuario autenticado para crear el comercio.');
  }

  let logo_url = sanitizeImageUrl(payload.logo_url);
  let banner_url = sanitizeImageUrl(payload.banner_url);

  if (payload.logo_file) {
    const uploadedLogo = await uploadToImgBB(payload.logo_file, {
      compress: true,
    });
    logo_url = uploadedLogo;
  }

  if (payload.banner_file) {
    const uploadedBanner = await uploadToImgBB(payload.banner_file, {
      compress: true,
    });
    banner_url = uploadedBanner;
  }

const { data, error } = await supabase
    .from('merchants')
    .insert({
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