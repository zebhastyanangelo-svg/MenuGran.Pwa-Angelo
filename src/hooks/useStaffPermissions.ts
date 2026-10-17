import { useQuery } from '@tanstack/react-query'
import { supabase, TABLE_NAMES } from '../services/supabase'
import { useAuth } from './useAuth'
import type { MerchantStaffPermissions } from '../types/database'

export interface UseStaffPermissionsResult {
  permissions: MerchantStaffPermissions | null
  isLoading: boolean
  /** `true` cuando la consulta falló y no se pudo resolver el permiso. */
  hasError: boolean
}

/**
 * Combina las fichas activas de un empleado en un solo objeto de permisos.
 *
 * Un mismo usuario puede aparecer en más de una ficha (dos comercios, o un alta
 * duplicada tras un reintento). Antes se leía con `maybeSingle()`, que devuelve
 * error cuando hay más de una fila: el `queryFn` lanzaba, `permissions` se
 * quedaba en `null` para siempre y el tablero de pedidos quedaba bloqueado en
 * "solo lectura" aunque el permiso estuviera activo en la base. Ganar un permiso
 * en cualquiera de las fichas debe bastar para poder operar.
 */
export function mergeStaffPermissions(
  rows: readonly { permissions: MerchantStaffPermissions | null }[],
): MerchantStaffPermissions | null {
  const active = rows.filter(
    (row): row is { permissions: MerchantStaffPermissions } =>
      row.permissions !== null && typeof row.permissions === 'object',
  )
  if (active.length === 0) return null
  return active.reduce<Partial<MerchantStaffPermissions>>((merged, row) => {
    for (const [key, value] of Object.entries(row.permissions)) {
      if (value === true) {
        // `true` gana siempre: si alguna ficha concede el permiso, el empleado
        // lo tiene.
        Object.assign(merged, { [key]: true })
      } else if (!(key in merged)) {
        Object.assign(merged, { [key]: value })
      }
    }
    return merged
  }, {}) as MerchantStaffPermissions
}

export function useStaffPermissions(): UseStaffPermissionsResult {
  const { user, profile } = useAuth()
  const hasStaffRole = profile?.role === 'merchant_staff' || profile?.role === 'driver'

  const { data, isLoading, isError } = useQuery<
    MerchantStaffPermissions | null,
    Error
  >({
    queryKey: ['staffPermissions', user?.id],
    enabled: !!user && hasStaffRole,
    queryFn: async (): Promise<MerchantStaffPermissions | null> => {
      if (!user) return null

      // `.limit(1)` en lugar de `.maybeSingle()`: se leen todas las fichas
      // activas para combinarlas y nunca se falla por filas duplicadas.
      const { data, error: supaError } = await supabase
        .from(TABLE_NAMES.merchantStaff)
        .select('permissions')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (supaError !== null) {
        throw new Error(supaError.message)
      }

      const rows = (data ?? []) as { permissions: MerchantStaffPermissions | null }[]
      return mergeStaffPermissions(rows)
    },
  })

  return {
    permissions: data ?? null,
    isLoading: isLoading,
    hasError: isError,
  }
}

export default useStaffPermissions