import { describe, expect, it } from 'vitest';
import {
  VENEZUELAN_BANKS,
  findVenezuelanBank,
  getVenezuelanBankOptions,
  resolveVenezuelanBankName,
} from './venezuelanBanks';

describe('VENEZUELAN_BANKS', () => {
  it('incluye los bancos más usados en Venezuela', () => {
    const names = VENEZUELAN_BANKS.map((bank) => bank.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'Banco de Venezuela',
        'Banesco',
        'Mercantil',
        'BBVA Provincial',
        'Banco Nacional de Crédito',
        'Bancamiga',
        'Fondo Común',
        'Banplus',
        'Sofitasa',
      ]),
    );
  });

  it('usa códigos de 4 dígitos únicos', () => {
    const codes = VENEZUELAN_BANKS.map((bank) => bank.code);

    codes.forEach((code) => expect(code).toMatch(/^\d{4}$/));
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('findVenezuelanBank', () => {
  it('localiza por nombre canónico', () => {
    expect(findVenezuelanBank('Banesco')?.code).toBe('0134');
  });

  it('localiza por alias escrito de otra forma', () => {
    expect(findVenezuelanBank('Provincial')?.name).toBe('BBVA Provincial');
    expect(findVenezuelanBank('bdv')?.name).toBe('Banco de Venezuela');
    expect(findVenezuelanBank('BANCAMIGA')?.name).toBe('Bancamiga');
  });

  it('localiza por código de institución', () => {
    expect(findVenezuelanBank('0191')?.name).toBe('Banco Nacional de Crédito');
  });

  it('devuelve null para valores vacíos o desconocidos', () => {
    expect(findVenezuelanBank('')).toBeNull();
    expect(findVenezuelanBank('   ')).toBeNull();
    expect(findVenezuelanBank(null)).toBeNull();
    expect(findVenezuelanBank('Banco Inventado')).toBeNull();
  });
});

describe('resolveVenezuelanBankName', () => {
  it('normaliza variantes al nombre canónico', () => {
    expect(resolveVenezuelanBankName(' BANCO DE VENEZUELA ')).toBe('Banco de Venezuela');
    expect(resolveVenezuelanBankName('banco-agricola')).toBe('Banco Agrícola de Venezuela');
    expect(resolveVenezuelanBankName('BNC')).toBe('Banco Nacional de Crédito');
  });

  it('conserva un texto que no está en el catálogo', () => {
    expect(resolveVenezuelanBankName('  Banco Cooperativo Local  ')).toBe(
      'Banco Cooperativo Local',
    );
  });

  it('devuelve cadena vacía cuando no hay valor', () => {
    expect(resolveVenezuelanBankName(null)).toBe('');
    expect(resolveVenezuelanBankName(undefined)).toBe('');
  });
});

describe('getVenezuelanBankOptions', () => {
  it('ofrece el catálogo completo cuando el valor persistido es válido', () => {
    const options = getVenezuelanBankOptions('Banesco');

    expect(options.banks).toBe(VENEZUELAN_BANKS);
    expect(options.legacy).toBeNull();
  });

  it('añade el texto heredado para no perder el dato previo al selector', () => {
    expect(getVenezuelanBankOptions('  Mi Coop  ').legacy).toBe('Mi Coop');
    expect(getVenezuelanBankOptions('').legacy).toBeNull();
    expect(getVenezuelanBankOptions(null).legacy).toBeNull();
  });
});