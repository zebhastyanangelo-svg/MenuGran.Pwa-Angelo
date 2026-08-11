import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CategoryRow,
  DeliveryRow,
  MerchantRow,
  MerchantStaffRow,
  OrderRow,
  ProductRow,
  ProfileRow,
} from '../types/database';
import { validateRuntimeEnv } from '../utils/env';

/**
 * Cliente singleton de Supabase para el frontend.
 *
 * Usa las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
 * (ver `.env.example`). Ambas se inyectan en tiempo de build por Vite y se
 * exponen a la app a través de `import.meta.env`.
 *
 * La anon key es pública por diseño: la autorización fina la imponen las
 * Row Level Security policies en Postgres (ver `.harness/rules/architecture.md`).
 * Ningún secreto del servidor debe terminar aquí.
 */

const { supabaseUrl, supabaseAnonKey } = validateRuntimeEnv();

const TABLE_NAMES = {
  profiles: 'profiles',
  merchants: 'merchants',
  merchantStaff: 'merchant_staff',
  categories: 'categories',
  products: 'products',
  orders: 'orders',
  deliveries: 'deliveries',
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

/** Fila esperada por tabla — útil para autocomplete en `from(...)`. */
export interface DatabaseTables {
  profiles: ProfileRow;
  merchants: MerchantRow;
  merchant_staff: MerchantStaffRow;
  categories: CategoryRow;
  products: ProductRow;
  orders: OrderRow;
  deliveries: DeliveryRow;
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

export { TABLE_NAMES };
