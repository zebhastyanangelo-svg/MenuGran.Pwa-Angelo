import { describe, expect, it } from 'vitest';
import type { MerchantStaffPermissions } from '../types/database';
import { mergeStaffPermissions } from './useStaffPermissions';

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

describe('mergeStaffPermissions', () => {
  it('devuelve null cuando el empleado no tiene fichas', () => {
    expect(mergeStaffPermissions([])).toBeNull();
  });

  it('devuelve la ficha tal cual cuando hay una sola', () => {
    const permissions = buildPermissions({ can_manage_orders: true });

    expect(mergeStaffPermissions([{ permissions }])).toEqual(permissions);
  });

  it('gana el permiso si alguna de las fichas lo concede', () => {
    // Es el caso que dejaba el tablero bloqueado: dos fichas activas (dos
    // comercios o un alta duplicada) y el permiso solo en una de ellas.
    const merged = mergeStaffPermissions([
      { permissions: buildPermissions() },
      { permissions: buildPermissions({ can_manage_orders: true }) },
    ]);

    expect(merged?.can_manage_orders).toBe(true);
  });

  it('ignora las filas sin objeto de permisos', () => {
    const merged = mergeStaffPermissions([
      { permissions: null },
      { permissions: buildPermissions({ can_manage_orders: true }) },
    ]);

    expect(merged?.can_manage_orders).toBe(true);
  });

  it('conserva los permisos que solo aparecen en una ficha', () => {
    const merged = mergeStaffPermissions([
      { permissions: buildPermissions({ can_manage_orders: true }) },
      { permissions: buildPermissions({ can_view_assigned_deliveries: true }) },
    ]);

    expect(merged).toMatchObject({
      can_manage_orders: true,
      can_view_assigned_deliveries: true,
      can_view_orders: true,
    });
  });

  it('no degrada un permiso concedido a apagado por otra ficha', () => {
    const merged = mergeStaffPermissions([
      { permissions: buildPermissions({ can_manage_orders: true }) },
      { permissions: buildPermissions({ can_manage_orders: false }) },
    ]);

    expect(merged?.can_manage_orders).toBe(true);
  });
});