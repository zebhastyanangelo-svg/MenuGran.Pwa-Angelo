import { supabase, TABLE_NAMES } from './supabase';

export interface SuperAdminMetrics {
  totalMerchants: number;
  totalCustomers: number;
  totalOrders: number;
}

async function countRows(
  table: string,
  filters: Array<{ column: string; value: string }> = [],
): Promise<number> {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  for (const { column, value } of filters) {
    query = query.eq(column, value);
  }
  const { count, error } = await query;
  if (error !== null) {
    throw new Error(`Error al contar ${table}: ${error.message}`);
  }
  return count ?? 0;
}

/** Métricas globales de la plataforma para el dashboard del Super Admin. */
export async function fetchSuperAdminMetrics(): Promise<SuperAdminMetrics> {
  const [totalMerchants, totalCustomers, totalOrders] = await Promise.all([
    countRows(TABLE_NAMES.merchants),
    countRows(TABLE_NAMES.profiles, [
      { column: 'role', value: 'customer' },
    ]),
    countRows(TABLE_NAMES.orders),
  ]);
  return { totalMerchants, totalCustomers, totalOrders };
}

/**
 * Actualiza la contraseña de la sesión activa en Supabase Auth.
 */
export async function updateAuthPassword(
  newPassword: string,
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error !== null) {
    throw new Error(`Error al actualizar la contraseña: ${error.message}`);
  }
}
