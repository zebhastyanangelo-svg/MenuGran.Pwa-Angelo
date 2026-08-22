import { useCallback, useEffect, useState } from 'react';
import {
  createMerchantAccount,
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
}

/** Gestiona el listado y alta de comercios en el panel de Super Admin. */
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

  return { merchants, isLoading, error, lastCreatedPassword, addMerchant };
}

export default useSuperAdminMerchants;
