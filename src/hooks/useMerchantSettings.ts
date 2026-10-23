import { useCallback, useEffect, useState } from 'react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import { sanitizeMerchantImageUpdates } from '../services/merchantService';
import type { MerchantRow, MerchantUpdate } from '../types/database';

export interface UseMerchantSettingsResult {
  merchant: MerchantRow | null;
  isLoading: boolean;
  error: string | null;
  saveSettings: (updates: MerchantUpdate) => Promise<MerchantRow>;
  refetch: () => void;
}

export interface UseMerchantSettingsOptions {
  /**
   * Id de comercio forzado por el Superadmin (`?merchant_id=`). Cuando está
   * presente se carga ese comercio por id (la RLS permite al superadmin leer
   * cualquier fila) en lugar de resolver por `owner_id`.
   */
  merchantId?: string | null;
}

/**
 * Hook de gestión de la configuración del comercio.
 *
 * Carga el comercio cuyo `owner_id` coincide con el usuario autenticado
 * (o el fijado por el Superadmin vía `options.merchantId`) y expone una
 * función para persistir cambios parciales.
 */
export function useMerchantSettings(
  userId: string | null | undefined,
  options?: UseMerchantSettingsOptions,
): UseMerchantSettingsResult {
  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const forcedMerchantId = options?.merchantId?.trim() ?? '';

  const fetchMerchant = useCallback(async () => {
    if (!userId && forcedMerchantId === '') {
      setMerchant(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(TABLE_NAMES.merchants).select('*');
      query =
        forcedMerchantId !== ''
          ? query.eq('id', forcedMerchantId)
          : query.eq('owner_id', userId);

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      setMerchant((data ?? null) as MerchantRow | null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar la configuración del comercio.',
      );
      setMerchant(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, forcedMerchantId]);

  useEffect(() => {
    void fetchMerchant();
  }, [fetchMerchant]);

  const saveSettings = useCallback(
    async (updates: MerchantUpdate): Promise<MerchantRow> => {
      if (!merchant) {
        throw new Error('No hay comercio cargado para actualizar.');
      }

      // Las URLs de logo/banner se sanitizan antes de persistir: un valor
      // efímero (blob:) o inválido nunca debe llegar a la base de datos,
      // porque rompe el renderizado en móviles y PWAs cacheadas.
      const { data, error: updateError } = await supabase
        .from(TABLE_NAMES.merchants)
        .update(sanitizeMerchantImageUpdates(updates))
        .eq('id', merchant.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updated = (data ?? { ...merchant, ...updates }) as MerchantRow;
      setMerchant(updated);
      return updated;
    },
    [merchant],
  );

  const refetch = useCallback(() => {
    void fetchMerchant();
  }, [fetchMerchant]);

  return { merchant, isLoading, error, saveSettings, refetch };
}
