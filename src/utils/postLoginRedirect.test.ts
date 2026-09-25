import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_HOME,
  DRIVER_HOME,
  MERCHANT_HOME,
  SUPER_ADMIN_HOME,
  getPostLoginPath,
} from './postLoginRedirect';

describe('getPostLoginPath', () => {
  it('redirige al panel de Super Admin cuando el rol es superadmin', () => {
    expect(getPostLoginPath(null, 'superadmin')).toBe(SUPER_ADMIN_HOME);
    expect(getPostLoginPath(null, 'superadmin')).toBe('/super-admin/dashboard');
  });

  it('redirige al panel del comercio cuando el rol es merchant_owner', () => {
    expect(getPostLoginPath(null, 'merchant_owner')).toBe(MERCHANT_HOME);
    expect(getPostLoginPath(null, 'merchant_owner')).toBe('/admin');
  });

  it('redirige al panel del comercio cuando el rol es merchant_staff', () => {
    expect(getPostLoginPath(null, 'merchant_staff')).toBe(MERCHANT_HOME);
    expect(getPostLoginPath(null, 'merchant_staff')).toBe('/admin');
  });

  it('redirige al panel de entregas cuando el rol es driver', () => {
    expect(getPostLoginPath(null, 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath(null, 'driver')).toBe('/driver/deliveries');
  });

  it('mantiene la raíz como home del cliente (resuelta al marketplace)', () => {
    expect(getPostLoginPath(null, 'customer')).toBe(CUSTOMER_HOME);
    expect(getPostLoginPath(null, 'customer')).toBe('/');
    expect(getPostLoginPath(null, null)).toBe(CUSTOMER_HOME);
  });

  it('honra la ruta "from" aunque el usuario sea superadmin', () => {
    expect(
      getPostLoginPath('/merchant/dashboard', 'superadmin'),
    ).toBe('/merchant/dashboard');
  });

  it('honra la ruta "from" aunque el usuario sea driver', () => {
    expect(getPostLoginPath('/orders/123', 'driver')).toBe('/orders/123');
  });

  it('redirige al driver a su panel cuando "from" es ruta de comercio', () => {
    expect(getPostLoginPath('/admin', 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath('/admin/dishes', 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath('/merchant/dashboard', 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath('/merchant/profile', 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath('/super-admin', 'driver')).toBe(DRIVER_HOME);
    expect(getPostLoginPath('/super-admin/dashboard', 'driver')).toBe(DRIVER_HOME);
  });

  it('ignora una ruta "from" vacía y aplica el destino por rol', () => {
    expect(getPostLoginPath('', 'superadmin')).toBe(SUPER_ADMIN_HOME);
    expect(getPostLoginPath('', 'customer')).toBe(CUSTOMER_HOME);
    expect(getPostLoginPath('', 'merchant_owner')).toBe(MERCHANT_HOME);
    expect(getPostLoginPath('', 'merchant_staff')).toBe(MERCHANT_HOME);
    expect(getPostLoginPath('', 'driver')).toBe(DRIVER_HOME);
  });

  it('no filtra roles hacia su panel cuando no hay sesión definida', () => {
    expect(getPostLoginPath(null, undefined)).toBe(CUSTOMER_HOME);
  });
});
