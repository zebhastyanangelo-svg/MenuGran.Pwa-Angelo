import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_HOME,
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
    expect(getPostLoginPath(null, 'merchant_owner')).toBe(
      '/merchant/dashboard',
    );
  });

  it('mantiene el marketplace como destino por defecto del cliente', () => {
    expect(getPostLoginPath(null, 'customer')).toBe(CUSTOMER_HOME);
    expect(getPostLoginPath(null, null)).toBe(CUSTOMER_HOME);
  });

  it('honra la ruta "from" aunque el usuario sea superadmin', () => {
    expect(
      getPostLoginPath('/merchant/dashboard', 'superadmin'),
    ).toBe('/merchant/dashboard');
  });

  it('ignora una ruta "from" vacía y aplica el destino por rol', () => {
    expect(getPostLoginPath('', 'superadmin')).toBe(SUPER_ADMIN_HOME);
    expect(getPostLoginPath('', 'customer')).toBe(CUSTOMER_HOME);
    expect(getPostLoginPath('', 'merchant_owner')).toBe(MERCHANT_HOME);
  });

  it('no filtra roles hacia su panel cuando no hay sesión definida', () => {
    expect(getPostLoginPath(null, undefined)).toBe(CUSTOMER_HOME);
  });
});
