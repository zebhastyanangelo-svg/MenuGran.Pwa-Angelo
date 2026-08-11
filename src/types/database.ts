/**
 * Tipos de base de datos — mapeo 1:1 al schema PostgreSQL
 * definido en docs/DATABASE-SCHEMA.md.
 *
 * Convenciones:
 *  - UUID como string (formato canónico).
 *  - Timestamps como string ISO 8601 (lo que devuelve Supabase/Postgres por
 *    defecto vía JSON). Narrowing con helpers si se necesita Date.
 *  - POINT (PostGIS) serializado por Postgres a GeoJSON en consultas crudas;
 *    como la app no usa PostGIS directamente hoy, se modela como tupla
 *    `{ x: number; y: number }` representando (lng, lat) hasta que se decida
 *    lo contrario.
 *  - JSONB estricto: tipos nominales por tabla para mantener el contrato.
 *  - Sin `any`, sin `unknown` filtrado: cada campo tiene tipo conocido.
 */

/* ---------- ENUMS ---------- */

export type UserRole =
  | 'superadmin'
  | 'merchant_owner'
  | 'merchant_staff'
  | 'driver'
  | 'customer';

export type MerchantStatus =
  | 'pending_approval'
  | 'active'
  | 'suspended'
  | 'rejected';

export type OrderType = 'in_store' | 'pickup' | 'delivery';

export type PaymentMethod = 'cash' | 'pago_movil' | 'zelle' | 'card';

export type OrderStatus =
  | 'payment_pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type DeliveryStatus =
  | 'unassigned'
  | 'assigned'
  | 'picking_up'
  | 'on_the_way'
  | 'delivered'
  | 'failed';

/* ---------- TIPOS AUXILIARES ---------- */

export type IsoTimestamp = string;

/** Coordenada PostGIS POINT — actualmente (lng=x, lat=y). */
export interface GeoPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Cadena POINT de PostgREST: formato `(x,y)` que la API exige al escribir
 * (INSERT/UPDATE) columnas POINT de Postgres (ej. `orders.delivery_location`).
 */
export type DbPoint = string;

/* ---------- JSONB CONTRACTS ---------- */

export interface MerchantStaffPermissions {
  can_manage_menu: boolean;
  can_view_orders: boolean;
}

/** Payload de un item dentro del JSONB `orders.items`. */
export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export type MerchantVerificationDocs = Readonly<Record<string, unknown>>;

/* ---------- FILAS (SELECT) ---------- */

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface MerchantRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  status: MerchantStatus;
  verification_docs: MerchantVerificationDocs;
  is_active: boolean;
  location: GeoPoint | null;
  created_at: IsoTimestamp;
}

export interface MerchantStaffRow {
  id: string;
  merchant_id: string;
  user_id: string;
  permissions: MerchantStaffPermissions;
  is_active: boolean;
  created_at: IsoTimestamp;
}

export interface CategoryRow {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
  created_at: IsoTimestamp;
}

export interface ProductRow {
  id: string;
  merchant_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: string; // Postgres DECIMAL → string en JSON para preservar precisión
  image_url: string | null;
  is_available: boolean;
  created_at: IsoTimestamp;
}

export interface OrderRow {
  id: string;
  merchant_id: string;
  customer_id: string | null;
  type: OrderType;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  payment_proof_url: string | null;
  total_amount: string;
  table_number: string | null;
  delivery_location: GeoPoint | null;
  delivery_address_notes: string | null;
  items: readonly OrderItem[];
  created_at: IsoTimestamp;
}

export interface DeliveryRow {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: DeliveryStatus;
  current_location: GeoPoint | null;
  delivery_fee: string;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

/* ---------- INSERT (tipos de escritura parciales) ---------- */

export type ProfileInsert = Pick<ProfileRow, 'id' | 'email'> &
  Partial<Pick<ProfileRow, 'full_name' | 'avatar_url' | 'role'>>;

export type MerchantInsert = Pick<
  MerchantRow,
  'owner_id' | 'name' | 'slug'
> &
  Partial<Pick<MerchantRow, 'logo_url' | 'banner_url' | 'status' | 'is_active'>>;

export type MerchantStaffInsert = Pick<
  MerchantStaffRow,
  'merchant_id' | 'user_id'
> &
  Partial<Pick<MerchantStaffRow, 'permissions' | 'is_active'>>;

export type CategoryInsert = Pick<CategoryRow, 'merchant_id' | 'name'> &
  Partial<Pick<CategoryRow, 'sort_order'>>;

export type ProductInsert = Pick<
  ProductRow,
  'merchant_id' | 'category_id' | 'title' | 'price'
> &
  Partial<
    Pick<ProductRow, 'description' | 'image_url' | 'is_available'>
  >;

export type OrderInsert = Pick<
  OrderRow,
  'merchant_id' | 'payment_method' | 'total_amount' | 'items'
> &
  Partial<
    Pick<
      OrderRow,
      | 'customer_id'
      | 'type'
      | 'status'
      | 'payment_reference'
      | 'payment_proof_url'
      | 'table_number'
      | 'delivery_address_notes'
    > & {
      delivery_location?: DbPoint | null;
    }
  >;

export type DeliveryInsert = Pick<DeliveryRow, 'order_id'> &
  Partial<
    Pick<DeliveryRow, 'driver_id' | 'status' | 'delivery_fee'> & {
      current_location?: DbPoint | null;
    }
  >;

/* ---------- UPDATE (todos los campos opcionales) ---------- */

export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
export type MerchantUpdate = Partial<Omit<MerchantRow, 'id' | 'created_at'>>;
export type MerchantStaffUpdate = Partial<
  Omit<MerchantStaffRow, 'id' | 'created_at'>
>;
export type CategoryUpdate = Partial<Omit<CategoryRow, 'id' | 'created_at'>>;
export type ProductUpdate = Partial<Omit<ProductRow, 'id' | 'created_at'>>;
export type OrderUpdate = Partial<Omit<OrderRow, 'id' | 'created_at'>>;
export type DeliveryUpdate = Partial<
  Omit<DeliveryRow, 'id' | 'order_id' | 'created_at'>
>;
