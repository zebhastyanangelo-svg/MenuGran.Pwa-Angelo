import { useCallback, useEffect, useState } from 'react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { MerchantRow, MerchantUpdate } from '../types/database';

export interface UseMerchantSettingsResult {
  merchant: MerchantRow | null;
  isLoading: boolean;
  error: string | null;
  saveSettings: (updates: MerchantUpdate) => Promise<MerchantRow>;
  refetch: () => void;
}

/**
 * Hook de gestión de la configuración del comercio.
 *
 * Carga el comercio cuyo `owner_id` coincide con el usuario autenticado
 * y expone una función para persistir cambios parciales.
 */
export function useMerchantSettings(
  userId: string | null | undefined,
): UseMerchantSettingsResult {
  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = useCallback(async () => {
    if (!userId) {
      setMerchant(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from(TABLE_NAMES.merchants)
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

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
  }, [userId]);

  useEffect(() => {
    void fetchMerchant();
  }, [fetchMerchant]);

  const saveSettings = useCallback(
    async (updates: MerchantUpdate): Promise<MerchantRow> => {
      if (!merchant) {
        throw new Error('No hay comercio cargado para actualizar.');
      }

      const { data, error: updateError } = await supabase
        .from(TABLE_NAMES.merchants)
        .update(updates)
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
