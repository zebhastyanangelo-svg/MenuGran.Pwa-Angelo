/**
 * Servicio del panel del comercio: contexto (negocio del usuario), métricas
 * de la vista Perfil y gestión de empleados vía el Edge Function
 * `create-employee` (service_role key solo en el servidor).
 */
import { supabase, TABLE_NAMES } from './supabase';
import type {
  MerchantStaffPermissions,
  MerchantStaffRow,
  UserRole,
} from '../types/database';
import {
  DRIVER_PERMISSIONS,
  toStaffPermissions,
  validateEmployeeInput,
  type EmployeeFormInput,
} from '../utils/staffPermissions';
import { invokeAuthenticatedFunction } from './edgeFunctions';

export interface MerchantContext {
  merchantId: string;
  merchantName: string;
  isOwner: boolean;
  /**
   * `true` cuando el contexto viene del acceso transparente del Superadmin
   * (`?merchant_id=`): la sesión NO pertenece al comercio y las acciones de
   * cuenta propia (p. ej. cambiar contraseña) deben ocultarse.
   */
  isSuperAdminAccess?: boolean;
}

export interface StaffListItem {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  permissions: MerchantStaffPermissions;
  isActive: boolean;
}
/** Nombre de respaldo cuando el perfil del empleado no tiene nombre ni email. */
export const STAFF_FALLBACK_NAME = 'Empleado de Staff';

interface StaffQueryRow extends MerchantStaffRow {
  profiles: { email: string | null; full_name: string | null; role: UserRole } | null;
}

/** Ítem de repartidor para los selectores de asignación de pedidos. */
export interface DriverListItem {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface DriverStaffQueryRow {
  user_id: string;
  role: UserRole | null;
  permissions: MerchantStaffPermissions | null;
  profiles: { email: string | null; full_name: string | null; role: UserRole } | null;
}

/** Fila del directorio de repartidores que devuelve la RPC. */
interface DriverDirectoryRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

/**
 * Un empleado actúa como repartidor si su rol en merchant_staff es `driver`,
 * si su perfil lo marca como `driver`, o si tiene el permiso
 * `can_view_assigned_deliveries` (respaldo para registros antiguos o cuando
 * el JOIN a profiles viene NULL por RLS).
 */
export function isDriverStaffRow(row: DriverStaffQueryRow): boolean {
  return (
    row.role === 'driver' ||
    row.profiles?.role === 'driver' ||
    row.permissions?.can_view_assigned_deliveries === true
  );
}

/**
 * Nombre y correo de los repartidores desde `merchant_drivers_directory`.
 *
 * El empleado de tipo `merchant_staff` no puede leer el perfil de un repartidor
 * de su comercio: `private.is_profile_visible_by_merchant` solo abre los perfiles
 * cuyo rol en `merchant_staff` es `merchant_staff`. Cuando eso ocurre el JOIN
 * llega `null` y el selector "Asignar Rider" terminaba pintando el UUID. La RPC
 * devuelve solo esas dos columnas y filtra por el acceso al comercio. Nunca
 * debe romper la carga del tablero: si falla, se sigue con lo que haya.
 */
async function fetchDriversDirectory(
  merchantIds: string[],
): Promise<Map<string, DriverDirectoryRow>> {
  const empty = new Map<string, DriverDirectoryRow>();
  try {
    const { data, error } = await supabase.rpc('merchant_drivers_directory', {
      p_merchant_ids: merchantIds,
    });
    if (error !== null) return empty;
    return new Map(
      ((data ?? []) as DriverDirectoryRow[])
        .filter((row) => typeof row.user_id === 'string')
        .map((row) => [row.user_id, row]),
    );
  } catch (err) {
    console.error('[merchantStaffService] Error al resolver el directorio de repartidores:', err);
    return empty;
  }
}

/** Rellena con el directorio los repartidores sin nombre ni correo en el JOIN. */
async function attachDriverNames(
  drivers: DriverListItem[],
  merchantIds: string[],
): Promise<DriverListItem[]> {
  if (!drivers.some((driver) => driver.full_name === null && driver.email === null)) {
    return drivers;
  }
  const directory = await fetchDriversDirectory(merchantIds);
  return drivers.map((driver) => {
    const entry = directory.get(driver.id);
    if (entry === undefined) return driver;
    return {
      id: driver.id,
      full_name: entry.full_name ?? driver.full_name,
      email: entry.email ?? driver.email,
    };
  });
}

/**
 * Lista los repartidores activos de los comercios dados.
 * Consolida la consulta usada por los paneles del comercio para asignar
 * pedidos de delivery.
 */
export async function fetchMerchantDrivers(
  merchantIds: string[],
): Promise<DriverListItem[]> {
  if (merchantIds.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('user_id, role, permissions, profiles:user_id ( full_name, email, role )')
    .in('merchant_id', merchantIds)
    .eq('is_active', true);

  if (error !== null) {
    console.error(
      '[merchantStaffService] Error al cargar los repartidores:',
      error,
    );
    throw new Error(`Error al cargar los repartidores: ${error.message}`);
  }

  const drivers = ((data ?? []) as unknown as DriverStaffQueryRow[])
    .filter(isDriverStaffRow)
    .map((row) => ({
      id: row.user_id,
      full_name: row.profiles?.full_name ?? null,
      email: row.profiles?.email ?? null,
    }));

  return attachDriverNames(drivers, merchantIds);
}

export interface MerchantMetrics {
  totalSales: number;
  ordersToday: number;
  activeProducts: number;
}

/**
 * Resuelve el negocio del usuario: como propietario o como empleado.
 *
 * `forcedMerchantId` habilita el acceso transparente del Superadmin: cuando se
 * entrega, se devuelve ese comercio en lugar del propio del usuario. La
 * responsabilidad de verificar el rol `superadmin` es del llamador (el hook
 * `useSuperAdminMerchantOverride` ya lo comprueba); la RLS de la tabla
 * `merchants` permite al superadmin leer cualquier fila, así que un staff no
 * puede aprovechar el parámetro para espiar comercios ajenos.
 */
export async function getMerchantContext(
  userId: string,
  forcedMerchantId?: string | null,
): Promise<MerchantContext | null> {
  const forcedId = forcedMerchantId?.trim() ?? '';
  if (forcedId !== '') {
    const forcedResult = await supabase
      .from(TABLE_NAMES.merchants)
      .select('id, name')
      .eq('id', forcedId)
      .maybeSingle();

    const forcedRow = forcedResult.data as { id: string; name: string } | null;
    if (forcedResult.error === null && forcedRow !== null) {
      return {
        merchantId: forcedRow.id,
        merchantName: forcedRow.name,
        isOwner: false,
        isSuperAdminAccess: true,
      };
    }
    return null;
  }

  const ownerResult = await supabase
    .from(TABLE_NAMES.merchants)
    .select('id, name')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (
    ownerResult.error === null &&
    ownerResult.data !== null &&
    typeof ownerResult.data === 'object' &&
    'id' in ownerResult.data
  ) {
    const row = ownerResult.data as { id: string; name: string };
    return { merchantId: row.id, merchantName: row.name, isOwner: true };
  }

  const staffResult = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('merchant_id, merchants(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  const staffRow = staffResult.data as
    | { merchant_id: string; merchants: { id: string; name: string } | null }
    | null;

  if (
    staffResult.error === null &&
    staffRow !== null &&
    staffRow.merchants !== null
  ) {
    return {
      merchantId: staffRow.merchants.id,
      merchantName: staffRow.merchants.name,
      isOwner: false,
    };
  }

  return null;
}

/** Lista los empleados vinculados al negocio con su perfil embebido. */
export async function listStaff(merchantId: string): Promise<StaffListItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .select('id, user_id, permissions, is_active, role, profiles:user_id ( full_name, email, role )')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: true });

  if (error !== null) {
    throw new Error(`Error al cargar los empleados: ${error.message}`);
  }

  return ((data ?? []) as unknown as StaffQueryRow[]).map((row) => {
    const profileEmail: string | null = row.profiles?.email ?? null;
    const profileName: string | null = row.profiles?.full_name ?? null;
    // Si profiles vino NULL (join fallido por RLS o perfil inexistente) o
    // los campos son null, usamos la parte local del email y el nombre de
    // respaldo genérico del staff.
    const emailLocal = profileEmail?.split('@')[0];
    const fullName =
      profileName ?? emailLocal ?? STAFF_FALLBACK_NAME;
    return {
      id: row.id,
      userId: row.user_id,
      fullName,
      email: profileEmail,
      role: row.profiles?.role ?? row.role ?? 'merchant_staff',
      permissions: row.permissions,
      isActive: row.is_active,
    };
  });
}

/**
 * Crea la cuenta del empleado invocando el Edge Function `create-employee`,
 * que usa la service_role key en el servidor tras validar los permisos del
 * llamador. Devuelve el id del empleado creado.
 *
 * La invocación renueva la sesión y reintenta una sola vez si el servidor
 * rechaza el token con 401; ese reintento vive en `invokeAuthenticatedFunction`
 * para que el panel no se quede en "Sesión inválida o expirada" con un refresh
 * token todavía válido.
 */
export async function createEmployee(
  merchantId: string,
  input: EmployeeFormInput,
): Promise<string> {
  const validationError = validateEmployeeInput(input);
  if (validationError !== null) throw new Error(validationError);

  const result = await invokeAuthenticatedFunction<{ staffId?: string }>(
    'create-employee',
    {
      merchantId,
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      role: input.role,
      permissions:
        input.role === 'driver'
          ? DRIVER_PERMISSIONS
          : toStaffPermissions(input.permissions),
    },
  );

  if (!result.ok) {
    throw new Error(
      result.serverMessage ?? `Error al crear el empleado: ${result.cause}`,
    );
  }
  const staffId = result.data?.staffId;
  if (typeof staffId !== 'string') {
    throw new Error('No se pudo registrar al empleado.');
  }
  return staffId;
}

/** Revoca o restaura el acceso de un empleado sin eliminar su cuenta. */
export async function setStaffActive(
  staffId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .update({ is_active: isActive })
    .eq('id', staffId);
  if (error !== null) {
    throw new Error(
      `Error al ${isActive ? 'restaurar' : 'revocar'} el acceso: ${error.message}`,
    );
  }
}

/** Elimina definitivamente la relación del empleado con el negocio. */
export async function deleteStaff(staffId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .delete()
    .eq('id', staffId);
  if (error !== null) {
    throw new Error(`Error al eliminar al empleado: ${error.message}`);
  }
}

/** Actualiza los permisos de un empleado vinculado al comercio. */
export async function updateStaffPermissions(
  staffId: string,
  permissions: MerchantStaffPermissions,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAMES.merchantStaff)
    .update({ permissions })
    .eq('id', staffId);
  if (error !== null) {
    throw new Error(`Error al actualizar permisos: ${error.message}`);
  }
}

/** Métricas resumen para las tarjetas de la vista Perfil. */
export interface MerchantMetrics {
  totalSales: number;
  ordersToday: number;
  activeProducts: number;
}

/**
 * Métricas resumen para las tarjetas de la vista Perfil.
 * Acepta un rango de fechas opcional (`startDate`, `endDate` en formato ISO
 * `YYYY-MM-DD`). Cuando se proporciona, `totalSales` y `ordersToday` se
 * calculan filtrando los pedidos del comercio dentro de ese rango.
 */
export async function fetchMerchantMetrics(
  merchantId: string,
  startDate?: string,
  endDate?: string,
): Promise<MerchantMetrics> {
  let salesQuery = supabase
    .from(TABLE_NAMES.orders)
    .select('total_amount')
    .eq('merchant_id', merchantId);

  let countQuery = supabase
    .from(TABLE_NAMES.orders)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  if (startDate !== undefined && endDate !== undefined) {
    const start = `${startDate}T00:00:00.000Z`;
    const end = `${endDate}T23:59:59.999Z`;
    salesQuery = salesQuery.gte('created_at', start).lte('created_at', end);
    countQuery = countQuery.gte('created_at', start).lte('created_at', end);
  } else {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    countQuery = countQuery.gte('created_at', startOfDay.toISOString());
  }

  const productsResult = await supabase
    .from(TABLE_NAMES.products)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('is_available', true);

  const [salesResult, todayResult] = await Promise.all([salesQuery, countQuery]);

  if (salesResult.error !== null || todayResult.error !== null || productsResult.error !== null) {
    throw new Error('Error al calcular las métricas del comercio.');
  }

  const totalSales = ((salesResult.data ?? []) as Array<{ total_amount: number }>)
    .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);

  return {
    totalSales,
    ordersToday: todayResult.count ?? 0,
    activeProducts: productsResult.count ?? 0,
  };
}
