/**
 * Corte de acceso del Tablero de Pedidos en Vivo.
 *
 * El tablero se abre en `/merchant/dashboard` (cualquier empleado del comercio)
 * y en `/admin` (empleado con `can_manage_orders`). Aquí se decide qué puede
 * ver y hacer cada rol dentro de la vista, de modo que el empleado de cocina o
 * caja trabaje únicamente sobre las tarjetas de pedidos.
 */

import type { MerchantStaffPermissions, UserRole } from '../types/database';

/** Roles con control total del negocio: ven finanzas y todas las acciones. */
const FINANCE_ROLES: readonly UserRole[] = ['merchant_owner', 'superadmin'];

/**
 * `permissions` es un JSONB que cada escritor de la plataforma ha guardado con
 * una forma ligeramente distinta: las fichas antiguas no tienen la clave
 * `can_manage_orders`, y los importes o scripts manuales pueden haber dejado el
 * booleano como el texto `"true"`. Leerlo con `=== true` producía un falso
 * negativo que bloqueaba al empleado con el permiso bien puesto en la base.
 */
function isPermissionGranted(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Las finanzas globales del local (ventas del día, totales agregados) solo son
 * visibles para el propietario y el superadmin. El personal necesita ver los
 * montos de *su* pedido para cobrar en caja, pero no la foto financiera del
 * negocio.
 */
export function canViewBoardFinances(role: UserRole | null | undefined): boolean {
  return role !== null && role !== undefined && FINANCE_ROLES.includes(role);
}

/**
 * Permiso para operar las tarjetas (cambiar estados, asignar repartidor,
 * validar pagos). El propietario y el superadmin siempre; el empleado solo si
 * su ficha de `merchant_staff` tiene `can_manage_orders`.
 *
 * Un empleado con el permiso activo debe poder aceptar, rechazar y cambiar
 * estados. Por eso la lectura del JSONB es tolerante (ver `isPermissionGranted`)
 * y no se exige que el resto de claves del permiso existan.
 */
export function canOperateBoard(
  role: UserRole | null | undefined,
  permissions: MerchantStaffPermissions | null | undefined,
): boolean {
  if (canViewBoardFinances(role)) return true;
  if (role !== 'merchant_staff') return false;
  return isPermissionGranted(permissions?.can_manage_orders);
}

/**
 * `true` mientras los permisos del empleado siguen en vuelo.
 *
 * El tablero no debe declarar "solo lectura" en esa ventana: el empleado
 * llegaría con el permiso puesto en la base y vería el tablero bloqueado hasta
 * que la consulta respondiera.
 */
export function isBoardPermissionsLoading(
  role: UserRole | null | undefined,
  isLoading: boolean,
): boolean {
  // El propietario y el superadmin no dependen de la ficha de permisos: nunca
  // hay nada que esperar.
  if (canViewBoardFinances(role)) return false;
  if (role !== 'merchant_staff') return false;
  return isLoading;
}

/** El personal sin permiso de operación solo consulta el tablero en lectura. */
export function isBoardReadOnly(
  role: UserRole | null | undefined,
  permissions: MerchantStaffPermissions | null | undefined,
): boolean {
  return !canOperateBoard(role, permissions);
}