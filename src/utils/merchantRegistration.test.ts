import { describe, expect, it } from 'vitest';
import {
  generateTemporaryPassword,
  slugifyMerchantName,
  validateCreateMerchantInput,
  type CreateMerchantAccountInput,
} from './merchantRegistration';

function buildValidInput(): CreateMerchantAccountInput {
  return {
    ownerFullName: 'María Pérez',
    ownerCi: 'V-12345678',
    ownerPhone: '04141234567',
    ownerEmail: 'maria@pizzeria.com',
    ownerPassword: 'ClaveInicial1',
    businessName: 'La Pizzería de María',
    businessRif: 'J-40123456-7',
  };
}

describe('slugifyMerchantName', () => {
  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(slugifyMerchantName('La Pizzería de María')).toBe(
      'la-pizzeria-de-maria',
    );
  });

  it('elimina guiones redundantes en los bordes', () => {
    expect(slugifyMerchantName('  --Arepa & Co.--  ')).toBe('arepa-co');
  });

  it('devuelve un slug por defecto cuando el nombre no tiene caracteres válidos', () => {
    expect(slugifyMerchantName('***')).toBe('comercio');
  });
});

describe('generateTemporaryPassword', () => {
  it('genera una contraseña con la longitud solicitada', () => {
    expect(generateTemporaryPassword(20)).toHaveLength(20);
  });

  it('genera contraseñas distintas entre llamadas', () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();
    expect(first).not.toBe(second);
  });
});

describe('validateCreateMerchantInput', () => {
  it('devuelve null cuando todos los datos son válidos', () => {
    expect(validateCreateMerchantInput(buildValidInput())).toBeNull();
  });

  const cases: Array<[keyof CreateMerchantAccountInput, string]> = [
    ['ownerFullName', 'nombre del propietario'],
    ['ownerCi', 'C.I.'],
    ['ownerPhone', 'teléfono'],
    ['businessName', 'nombre del negocio'],
    ['businessRif', 'RIF'],
  ];

  for (const [field, label] of cases) {
    it(`rechaza el formulario sin ${label}`, () => {
      const input = buildValidInput();
      input[field] = '   ';
      const error = validateCreateMerchantInput(input);
      expect(error).not.toBeNull();
      expect(error).toMatch(new RegExp(label.split(' ')[0], 'i'));
    });
  }

  it('rechaza un email con formato inválido', () => {
    const input = buildValidInput();
    input.ownerEmail = 'no-es-un-email';
    expect(validateCreateMerchantInput(input)).toContain('email válido');
  });

  it('rechaza el formulario sin contraseña inicial', () => {
    const input = buildValidInput();
    input.ownerPassword = '   ';
    expect(validateCreateMerchantInput(input)).toContain(
      'contraseña inicial del propietario es obligatoria',
    );
  });

  it('rechaza contraseñas más cortas que el mínimo permitido', () => {
    const input = buildValidInput();
    input.ownerPassword = 'abc';
    expect(validateCreateMerchantInput(input)).toContain(
      'al menos 6 caracteres',
    );
  });
});
