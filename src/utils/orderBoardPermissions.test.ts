import { describe, expect, it } from 'vitest';
import type { MerchantStaffPermissions } from '../types/database';
import {
  canOperateBoard,
  canViewBoardFinances,
  isBoardReadOnly,
} from './orderBoardPermissions';

function buildPermissions(
  overrides: Partial<MerchantStaffPermissions> = {},
): MerchantStaffPermissions {
  return {
    can_manage_menu: false,
    can_view_orders: true,
    can_view_assigned_deliveries: false,
    ...overrides,
  };
}

describe('canViewBoardFinances', () => {
  it('habilita las finanzas globales al propietario y al superadmin', () => {
    expect(canViewBoardFinances('merchant_owner')).toBe(true);
    expect(canViewBoardFinances('superadmin')).toBe(true);
  });

  it('oculta las finanzas globales al personal y a los demás roles', () => {
    expect(canViewBoardFinances('merchant_staff')).toBe(false);
    expect(canViewBoardFinances('driver')).toBe(false);
    expect(canViewBoardFinances('customer')).toBe(false);
    expect(canViewBoardFinances(null)).toBe(false);
    expect(canViewBoardFinances(undefined)).toBe(false);
  });
});

describe('canOperateBoard', () => {
  it('deja operar siempre al propietario y al superadmin', () => {
    expect(canOperateBoard('merchant_owner', null)).toBe(true);
    expect(canOperateBoard('superadmin', null)).toBe(true);
  });

  it('exige can_manage_orders para el personal del comercio', () => {
    expect(canOperateBoard('merchant_staff', buildPermissions({ can_manage_orders: true }))).toBe(
      true,
    );
    expect(canOperateBoard('merchant_staff', buildPermissions())).toBe(false);
    expect(canOperateBoard('merchant_staff', null)).toBe(false);
  });

  it('niega la operación a repartidores y clientes', () => {
    expect(
      canOperateBoard('driver', buildPermissions({ can_manage_orders: true })),
    ).toBe(false);
    expect(canOperateBoard('customer', buildPermissions({ can_manage_orders: true }))).toBe(
      false,
    );
  });
});

describe('isBoardReadOnly', () => {
  it('marca el tablero como solo lectura sin permiso de operación', () => {
    expect(isBoardReadOnly('merchant_staff', buildPermissions())).toBe(true);
  });

  it('deja el tablero operable con permisos o con rol propietario', () => {
    expect(
      isBoardReadOnly('merchant_staff', buildPermissions({ can_manage_orders: true })),
    ).toBe(false);
    expect(isBoardReadOnly('merchant_owner', buildPermissions())).toBe(false);
  });
});
