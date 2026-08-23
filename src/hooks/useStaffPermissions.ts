import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES } from '../services/supabase';
import type { MerchantStaffPermissions } from '../types/database';
import { useAuth } from './useAuth';

export interface UseStaffPermissionsResult {
  permissions: MerchantStaffPermissions | null;
  isLoading: boolean;
}

/**
 * Resuelve los permisos granularizados del empleado autenticado
 * (rol merchant_staff). Para el resto de roles devuelve null.
 */
export function useStaffPermissions(): UseStaffPermissionsResult {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] =
    useState<MerchantStaffPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isStaff = profile?.role === 'merchant_staff';

  useEffect(() => {
    if (user === null || !isStaff) {
      setPermissions(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void supabase
      .from(TABLE_NAMES.merchantStaff)
      .select('permissions, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { permissions: MerchantStaffPermissions } | null;
        setPermissions(row?.permissions ?? null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, isStaff]);

  return { permissions, isLoading };
}

export default useStaffPermissions;
