import { describe, expect, it } from 'vitest';
import {
  getNavItemsForRole,
  merchantNavItems,
} from './navItems';
import type { MerchantStaffPermissions } from '../../types/database';

const FULL_PERMISSIONS: MerchantStaffPermissions = {
  can_manage_menu: true,
  can_view_orders: true,
  can_manage_orders: true,
};

describe('getNavItemsForRole', () => {
  it('muestra el panel completo al propietario', () => {
    const items = getNavItemsForRole('merchant_owner').map((i) => i.to);
    expect(items).toContain('/admin/dashboard');
    expect(items).toContain('/admin');
    expect(items).toContain('/admin/dishes');
    expect(items).toContain('/admin/settings');
    expect(items).toContain('/admin/profile');
  });

  it('incluye la ruta de Perfil del comercio (/admin/profile)', () => {
    const profileItem = merchantNavItems.find((i) => i.to === '/admin/profile');
    expect(profileItem).toBeDefined();
  });

  it('incluye la ruta de Resumen (/admin/dashboard) con el label "Resumen"', () => {
    const resumenItem = merchantNavItems.find((i) => i.to === '/admin/dashboard');
    expect(resumenItem).toBeDefined();
    expect(resumenItem?.label).toBe('Resumen');
  });

  it('filtra secciones de empleados según permisos granularizados', () => {
    const staffItems = getNavItemsForRole('merchant_staff', FULL_PERMISSIONS).map(
      (i) => i.to,
    );
    expect(staffItems).toContain('/admin/dishes'); // can_manage_menu
    expect(staffItems).not.toContain('/admin/settings'); // ownerOnly
    expect(staffItems).toContain('/admin/profile'); // visible para todo merchant
    expect(staffItems).toContain('/admin/dashboard'); // resumen visible para staff
  });

  it('oculta Platos a empleados sin can_manage_menu pero mantiene Perfil y Resumen', () => {
    const limited: MerchantStaffPermissions = {
      can_manage_menu: false,
      can_view_orders: true,
      can_manage_orders: false,
    };
    const items = getNavItemsForRole('merchant_staff', limited).map((i) => i.to);
    expect(items).not.toContain('/admin/dishes');
    expect(items).not.toContain('/admin/settings');
    expect(items).toContain('/admin/profile'); // siempre visible para merchant
    expect(items).toContain('/admin');
    expect(items).toContain('/admin/dashboard'); // resumen siempre visible
  });

  it('no muestra secciones de administración mientras los permisos cargan', () => {
    const items = getNavItemsForRole('merchant_staff', null).map((i) => i.to);
    expect(items).not.toContain('/admin/dishes');
    expect(items).not.toContain('/admin/settings');
    expect(items).toContain('/admin/profile'); // visible sin permisos cargados
    expect(items).toContain('/admin/dashboard'); // resumen visible sin permisos
  });

  it('muestra /admin/profile a merchant_staff con permisos completos', () => {
    const items = getNavItemsForRole('merchant_staff', FULL_PERMISSIONS).map((i) => i.to);
    expect(items).toContain('/admin/profile');
    expect(items).toContain('/admin');
    expect(items).toContain('/admin/dashboard');
    expect(items).toContain('/admin/dishes');
  });

  it('mantiene la navegación de cliente y superadmin intacta', () => {
    expect(getNavItemsForRole('customer')[0].to).toBe('/marketplace');
    expect(getNavItemsForRole('superadmin')[0].to).toBe(
      '/super-admin/dashboard',
    );
  });
});
