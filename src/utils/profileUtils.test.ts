import { describe, expect, it } from 'vitest';
import {
  REQUIRED_PROFILE_FIELDS,
  getMissingProfileFields,
  isProfileIncomplete,
} from './profileUtils';

describe('isProfileIncomplete', () => {
  it('requiere teléfono y cédula', () => {
    expect(isProfileIncomplete({ phone: '+584121234567', ci: 'V12345678' })).toBe(false);
    expect(isProfileIncomplete({ phone: '+584121234567', ci: null })).toBe(true);
    expect(isProfileIncomplete({ phone: null, ci: 'V12345678' })).toBe(true);
    expect(isProfileIncomplete({ phone: null, ci: null })).toBe(true);
  });

  it('no bloquea perfiles sin cargar', () => {
    expect(isProfileIncomplete(null)).toBe(false);
  });
});

describe('getMissingProfileFields', () => {
  it('lista los campos obligatorios pendientes', () => {
    expect(getMissingProfileFields({ phone: null, ci: null })).toEqual([
      'Teléfono',
      'Cédula de Identidad',
    ]);
    expect(getMissingProfileFields({ phone: null, ci: 'V12345678' })).toEqual(['Teléfono']);
    expect(getMissingProfileFields({ phone: '0412', ci: null })).toEqual(['Cédula de Identidad']);
  });

  it('devuelve vacío con el perfil completo o sin cargar', () => {
    expect(getMissingProfileFields({ phone: '0412', ci: 'V123' })).toEqual([]);
    expect(getMissingProfileFields(null)).toEqual([]);
  });

  it('coincide con los campos declarados como obligatorios', () => {
    const labels = REQUIRED_PROFILE_FIELDS.map((field) => field.label);
    expect(getMissingProfileFields({})).toEqual(labels);
  });
});
