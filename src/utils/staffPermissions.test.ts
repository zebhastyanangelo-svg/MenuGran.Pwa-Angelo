import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAFF_PERMISSIONS,
  toStaffPermissions,
  validateEmployeeInput,
  type EmployeeFormInput,
} from './staffPermissions';

function buildValidInput(): EmployeeFormInput {
  return {
    fullName: 'Ana Gómez',
    email: 'ana@pizzeria.com',
    password: 'Clave123',
    role: 'merchant_staff',
    permissions: { can_manage_orders: true, can_manage_menu: false, can_manage_settings: false, can_view_metrics: false },
  };
}

describe('validateEmployeeInput', () => {
  it('devuelve null con datos válidos', () => {
    expect(validateEmployeeInput(buildValidInput())).toBeNull();
  });

  it('rechaza nombre vacío', () => {
    const input = buildValidInput();
    input.fullName = '   ';
    expect(validateEmployeeInput(input)).toContain('nombre completo');
  });

  it('rechaza emails inválidos', () => {
    const input = buildValidInput();
    input.email = 'no-email';
    expect(validateEmployeeInput(input)).toContain('email válido');
  });

  it('rechaza contraseñas cortas', () => {
    const input = buildValidInput();
    input.password = 'abc';
    expect(validateEmployeeInput(input)).toContain('al menos 6 caracteres');
  });
});

describe('toStaffPermissions', () => {
  it('normaliza los checkboxes al contrato JSONB', () => {
    expect(
      toStaffPermissions({ can_manage_orders: true, can_manage_menu: true, can_manage_settings: false, can_view_metrics: false }),
    ).toEqual({
      can_manage_menu: true,
      can_view_orders: true,
      can_manage_orders: true,
      can_manage_settings: false,
      can_view_metrics: false,
    });
  });

  it('siempre concede ver pedidos', () => {
    expect(
      toStaffPermissions({ can_manage_orders: false, can_manage_menu: false, can_manage_settings: false, can_view_metrics: false }),
    ).toEqual({
      can_manage_menu: false,
      can_view_orders: true,
      can_manage_orders: false,
      can_manage_settings: false,
      can_view_metrics: false,
    });
  });

  it('expone permisos por defecto de solo lectura', () => {
    expect(DEFAULT_STAFF_PERMISSIONS.can_manage_menu).toBe(false);
    expect(DEFAULT_STAFF_PERMISSIONS.can_view_orders).toBe(true);
  });
});
