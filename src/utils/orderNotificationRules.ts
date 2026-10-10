/**
 * Reglas de notificaciones de pedidos adaptadas por rol.
 *
 * Define quién recibe avisos de nuevos pedidos para que cada rol solo vea lo
 * que le corresponde:
 *  - Dueño de comercio: todos los movimientos y nuevos pedidos de su local.
 *  - Empleado/Staff: los pedidos bajo su gestión (permiso `can_manage_orders`).
 *  - Repartidor: nunca recibe avisos de nuevos pedidos del comercio; su único
 *    aviso es la asignación de una nueva entrega (push del panel).
 *  - Cliente: no recibe avisos operativos del comercio.
 */

import type { MerchantStaffPermissions, UserRole } from '../types/database';

/**
 * Indica si el rol debe recibir la notificación de nuevo pedido.
 *
 * `permissions` solo interesa para `merchant_staff`: un empleado sin el
 * permiso de gestionar pedidos no recibe los avisos.
 */
export function shouldNotifyNewOrder(
  role: UserRole | null | undefined,
  permissions: MerchantStaffPermissions | null = null,
): boolean {
  switch (role) {
    case 'merchant_owner':
      // El dueño ve y recibe avisos de todos los movimientos de su local.
      return true;
    case 'superadmin':
      return true;
    case 'merchant_staff':
      // Solo los pedidos asignados a su gestión.
      return permissions?.can_manage_orders ?? false;
    case 'driver':
      // El repartidor solo recibe la notificación de entrega asignada.
      return false;
    default:
      return false;
  }
}
