import { describe, expect, it } from 'vitest';
import { validatePasswordChange } from './passwordChange';

describe('validatePasswordChange', () => {
  it('devuelve null cuando las contraseñas son válidas y coinciden', () => {
    expect(
      validatePasswordChange({
        newPassword: 'ClaveSegura1',
        confirmPassword: 'ClaveSegura1',
      }),
    ).toBeNull();
  });

  it('rechaza contraseñas menores a 8 caracteres', () => {
    expect(
      validatePasswordChange({
        newPassword: 'corta12',
        confirmPassword: 'corta12',
      }),
    ).toContain('al menos 8 caracteres');
  });

  it('rechaza contraseñas que no coinciden', () => {
    expect(
      validatePasswordChange({
        newPassword: 'ClaveSegura1',
        confirmPassword: 'OtraClave99',
      }),
    ).toContain('no coinciden');
  });

  it('rechaza campos vacíos', () => {
    expect(
      validatePasswordChange({ newPassword: '', confirmPassword: '' }),
    ).not.toBeNull();
  });
});
