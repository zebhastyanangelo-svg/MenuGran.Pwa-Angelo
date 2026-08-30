import { supabase } from './supabase';
import { uploadToImgBB } from './imgbb';
import type { MerchantRow } from '../types/database';
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
  logo_file?: File | null;
  banner_file?: File | null;
  logo_url?: string | null;
  banner_url?: string | null;
}

export async function createMerchant(
  payload: CreateMerchantPayload,
): Promise<MerchantRow> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    throw new Error('No se pudo obtener el usuario autenticado para crear el comercio.');
  }

  let logo_url = payload.logo_url;
  let banner_url = payload.banner_url;

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
    .update(updates)
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