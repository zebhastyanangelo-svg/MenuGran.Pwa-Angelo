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
 */
export function canOperateBoard(
  role: UserRole | null | undefined,
  permissions: MerchantStaffPermissions | null | undefined,
): boolean {
  if (canViewBoardFinances(role)) return true;
  if (role !== 'merchant_staff') return false;
  return permissions?.can_manage_orders === true;
}

/** El personal sin permiso de operación solo consulta el tablero en lectura. */
export function isBoardReadOnly(
  role: UserRole | null | undefined,
  permissions: MerchantStaffPermissions | null | undefined,
): boolean {
  return !canOperateBoard(role, permissions);
}
