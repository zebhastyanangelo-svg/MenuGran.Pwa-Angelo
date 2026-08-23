import { useCallback, useEffect, useState } from 'react';
import {
  createMerchantAccount,
  deleteMerchant,
  listMerchantsWithOwners,
  type MerchantAccountListItem,
} from '../services/superAdminService';
import type { CreateMerchantAccountInput } from '../utils/merchantRegistration';

export interface UseSuperAdminMerchantsResult {
  merchants: MerchantAccountListItem[];
  isLoading: boolean;
  error: string | null;
  lastCreatedPassword: string | null;
  addMerchant: (
    input: CreateMerchantAccountInput,
  ) => Promise<MerchantAccountListItem['id']>;
  removeMerchant: (merchant: MerchantAccountListItem) => Promise<void>;
}

/** Gestiona el listado, alta y eliminación de comercios en el panel de Super Admin. */
export function useSuperAdminMerchants(): UseSuperAdminMerchantsResult {
  const [merchants, setMerchants] = useState<MerchantAccountListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedPassword, setLastCreatedPassword] = useState<
    string | null
  >(null);

  const refresh = useCallback(async () => {
    try {
      const items = await listMerchantsWithOwners();
      setMerchants(items);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudieron cargar los comercios.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addMerchant = useCallback(
    async (input: CreateMerchantAccountInput): Promise<string> => {
      const result = await createMerchantAccount(input);
      await refresh();
      setLastCreatedPassword(result.temporaryPassword);
      return result.merchantId;
    },
    [refresh],
  );

  const removeMerchant = useCallback(
    async (merchant: MerchantAccountListItem): Promise<void> => {
      if (merchant.owner_id === null) {
        throw new Error('El comercio no tiene un propietario asociado.');
      }
      await deleteMerchant(merchant.id, merchant.owner_id);
      await refresh();
    },
    [refresh],
  );

  return { merchants, isLoading, error, lastCreatedPassword, addMerchant, removeMerchant };
}

export default useSuperAdminMerchants;
