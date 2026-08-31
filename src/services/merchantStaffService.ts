/**
 * Servicio del panel del comercio: contexto (negocio del usuario), métricas
 * de la vista Perfil y gestión de empleados vía el Edge Function
 * `create-employee` (service_role key solo en el servidor).
 */
import { supabase, TABLE_NAMES } from './supabase';
import type {
  MerchantStaffPermissions,
  MerchantStaffRow,
} from '../types/database';
import {
  DRIVER_PERMISSIONS,
  toStaffPermissions,
  validateEmployeeInput,
  type EmployeeFormInput,
} from '../utils/staffPermissions';

export interface MerchantContext {
  merchantId: string;
  merchantName: string;
  isOwner: boolean;
}

export interface StaffListItem {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  permissions: MerchantStaffPermissions;
  isActive: boolean;
}interface StaffQueryRow extends MerchantStaffRow {
  profiles: { email: string | null; full_name: string | null } | null;
}

export interface MerchantMetrics {
  totalSales: number;
  ordersToday: number;
  activeProducts: number;
}

/** Resuelve el negocio del usuario: como propietario o como empleado. */
export async function getMerchantContext(
  userId: string,
): Promise<MerchantContext | null> {
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
    .select('id, user_id, permissions, is_active, profiles:user_id ( full_name, email )')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: true });

  if (error !== null) {
    throw new Error(`Error al cargar los empleados: ${error.message}`);
  }

  return ((data ?? []) as unknown as StaffQueryRow[]).map((row) => {
    const profileEmail: string | null = row.profiles?.email ?? null;
    const profileName: string | null = row.profiles?.full_name ?? null;
    // Si profiles vino NULL (join fallido por RLS o perfil inexistente) o
    // los campos son null, usamos la parte local del email y "Empleado de Staff".
    const emailLocal = profileEmail?.split('@')[0];
    const fullName =
      profileName ?? emailLocal ?? 'Empleado de Staff';
    return {
      id: row.id,
      userId: row.user_id,
      fullName,
      email: profileEmail,
      permissions: row.permissions,
      isActive: row.is_active,
    };
  });
}

/**
 * Crea la cuenta del empleado invocando el Edge Function `create-employee`,
 * que usa la service_role key en el servidor tras validar los permisos del
 * llamador. Devuelve el id del empleado creado.
 */
export async function createEmployee(
  merchantId: string,
  input: EmployeeFormInput,
): Promise<string> {
  const validationError = validateEmployeeInput(input);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.functions.invoke('create-employee', {
    body: {
      merchantId,
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      role: input.role,
      permissions: input.role === 'driver'
        ? DRIVER_PERMISSIONS
        : toStaffPermissions(input.permissions),
    },
  });

  // Cuando el Edge Function devuelve HTTP 4xx con JSON { error: "..." },
  // supabase.functions.invoke lo devuelve tanto en `error` como en `data`.
  // Priorizamos el cuerpo JSON del Edge Function para mostrar el mensaje
  // real de validación al usuario en el modal.
  if (data !== null && typeof data === 'object' && 'error' in data) {
    const serverMessage = (data as { error: unknown }).error;
    if (typeof serverMessage === 'string') {
      throw new Error(serverMessage);
    }
  }

  if (error !== null) {
    throw new Error(`Error al crear el empleado: ${error.message}`);
  }
  if (
    data === null ||
    typeof data !== 'object' ||
    !('staffId' in data) ||
    typeof (data as { staffId: unknown }).staffId !== 'string'
  ) {
    throw new Error('No se pudo registrar al empleado.');
  }
  return (data as { staffId: string }).staffId;
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
