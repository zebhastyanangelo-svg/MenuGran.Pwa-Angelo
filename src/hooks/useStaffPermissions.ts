import { useQuery } from '@tanstack/react-query'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useAuth } from './useAuth'
import type { MerchantStaffPermissions } from '../types/database'

export interface UseStaffPermissionsResult {
  permissions: MerchantStaffPermissions | null
  isLoading: boolean
}

export function useStaffPermissions(): UseStaffPermissionsResult {
  const { user, profile } = useAuth()
  const isStaff = profile?.role === 'merchant_staff'

  const { data, isLoading, isError } = useQuery<
    MerchantStaffPermissions | null,
    Error
  >({
    queryKey: ['staffPermissions', user?.id],
    enabled: !!user && isStaff,
    queryFn: async (): Promise<MerchantStaffPermissions | null> => {
      if (!user) return null

      const { data, error: supaError } = await supabase
        .from(TABLE_NAMES.merchantStaff)
        .select('permissions, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (supaError !== null) {
        throw new Error(supaError.message)
      }

      const row = data as { permissions: MerchantStaffPermissions } | null
      return row?.permissions ?? null
    },
  })

  return {
    permissions: data ?? null,
    isLoading: isLoading || isError,
  }
}

export default useStaffPermissions