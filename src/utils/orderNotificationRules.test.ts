import { describe, expect, it } from 'vitest';
import { shouldNotifyNewOrder } from './orderNotificationRules';
import type { MerchantStaffPermissions } from '../types/database';

const STAFF_WITH_ORDERS: MerchantStaffPermissions = {
  can_manage_menu: false,
  can_view_orders: true,
  can_manage_orders: true,
  can_manage_settings: false,
  can_view_metrics: false,
  can_view_assigned_deliveries: false,
};

const STAFF_WITHOUT_ORDERS: MerchantStaffPermissions = {
  can_manage_menu: true,
  can_view_orders: true,
  can_manage_orders: false,
  can_manage_settings: false,
  can_view_metrics: false,
  can_view_assigned_deliveries: false,
};

describe('shouldNotifyNewOrder', () => {
  it('el dueño del comercio recibe todos los nuevos pedidos de su local', () => {
    expect(shouldNotifyNewOrder('merchant_owner')).toBe(true);
    expect(shouldNotifyNewOrder('merchant_owner', null)).toBe(true);
  });

  it('el superadmin recibe los avisos de pedidos', () => {
    expect(shouldNotifyNewOrder('superadmin')).toBe(true);
  });

  it('el staff solo recibe pedidos si gestiona pedidos', () => {
    expect(shouldNotifyNewOrder('merchant_staff', STAFF_WITH_ORDERS)).toBe(true);
    expect(shouldNotifyNewOrder('merchant_staff', STAFF_WITHOUT_ORDERS)).toBe(false);
  });

  it('el staff sin permisos cargados no recibe avisos', () => {
    expect(shouldNotifyNewOrder('merchant_staff', null)).toBe(false);
  });

  it('el repartidor nunca recibe avisos de nuevos pedidos', () => {
    expect(shouldNotifyNewOrder('driver')).toBe(false);
  });

  it('los clientes y roles desconocidos no reciben avisos operativos', () => {
    expect(shouldNotifyNewOrder('customer')).toBe(false);
    expect(shouldNotifyNewOrder(null)).toBe(false);
    expect(shouldNotifyNewOrder(undefined)).toBe(false);
  });
});
