import { describe, expect, it } from 'vitest';
import {
  VENEZUELAN_BANKS,
  findVenezuelanBank,
  getVenezuelanBankOptions,
  resolveVenezuelanBankName,
  searchVenezuelanBanks,
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

describe('searchVenezuelanBanks', () => {
  it('devuelve el catálogo completo cuando no hay término', () => {
    expect(searchVenezuelanBanks('').banks).toEqual(VENEZUELAN_BANKS);
  });

  it('filtra por nombre sin distinguir tildes ni mayúsculas', () => {
    const names = searchVenezuelanBanks('banesco').banks.map((bank) => bank.name);
    const unaccented = searchVenezuelanBanks('AGRICOLA').banks.map((bank) => bank.name);

    expect(names).toContain('Banesco');
    expect(unaccented).toContain('Banco Agrícola de Venezuela');
  });

  it('filtra por código de institución', () => {
    const codes = searchVenezuelanBanks('0191').banks.map((bank) => bank.code);

    expect(codes).toEqual(['0191']);
  });

  it('encuentra por un alias escrito de otra forma', () => {
    const names = searchVenezuelanBanks('provincial').banks.map((bank) => bank.name);

    expect(names).toContain('BBVA Provincial');
  });

  it('devuelve una lista vacía cuando nada coincide', () => {
    const result = searchVenezuelanBanks('zzzz');

    expect(result.banks).toEqual([]);
    expect(result.legacy).toBeNull();
  });

  it('mantiene visible el valor previo al selector mientras encaje en la búsqueda', () => {
    const result = searchVenezuelanBanks('mi coop', 'Mi Coop');

    expect(result.legacy).toBe('Mi Coop');
    expect(result.banks).toEqual([]);
  });

  it('oculta el valor previo al selector cuando ya no encaja', () => {
    expect(searchVenezuelanBanks('banesco', 'Mi Coop').legacy).toBeNull();
  });
});