/**
 * Hook de gestión de tramos de tarifa de delivery por distancia.
 *
 * Carga los tramos del comercio y expone operaciones CRUD para el panel
 * de configuración del merchant.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  createDeliveryFeeTier,
  deleteDeliveryFeeTier,
  fetchDeliveryFeeTiers,
  updateDeliveryFeeTier,
  type DeliveryFeeTierInput,
} from '../services/deliveryFeeTiersService';
import type { DeliveryFeeTierRow } from '../types/database';

export interface UseDeliveryFeeTiersResult {
  tiers: DeliveryFeeTierRow[];
  isLoading: boolean;
  error: string | null;
  addTier: (input: DeliveryFeeTierInput) => Promise<void>;
  editTier: (tierId: string, input: DeliveryFeeTierInput) => Promise<void>;
  removeTier: (tierId: string) => Promise<void>;
}

export function useDeliveryFeeTiers(
  merchantId: string | null | undefined,
): UseDeliveryFeeTiersResult {
  const [tiers, setTiers] = useState<DeliveryFeeTierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTiers = useCallback(async () => {
    if (!merchantId) {
      setTiers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDeliveryFeeTiers(merchantId);
      setTiers(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar los tramos de tarifa.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    void loadTiers();
  }, [loadTiers]);

  const addTier = useCallback(
    async (input: DeliveryFeeTierInput) => {
      if (!merchantId) return;
      const created = await createDeliveryFeeTier(merchantId, input);
      setTiers((prev) =>
        [...prev, created].sort((a, b) => a.min_km - b.min_km),
      );
    },
    [merchantId],
  );

  const editTier = useCallback(
    async (tierId: string, input: DeliveryFeeTierInput) => {
      if (!merchantId) return;
      const updated = await updateDeliveryFeeTier(merchantId, tierId, input);
      setTiers((prev) =>
        prev
          .map((t) => (t.id === tierId ? updated : t))
          .sort((a, b) => a.min_km - b.min_km),
      );
    },
    [merchantId],
  );

  const removeTier = useCallback(
    async (tierId: string) => {
      if (!merchantId) return;
      await deleteDeliveryFeeTier(merchantId, tierId);
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
    },
    [merchantId],
  );

  return { tiers, isLoading, error, addTier, editTier, removeTier };
}
