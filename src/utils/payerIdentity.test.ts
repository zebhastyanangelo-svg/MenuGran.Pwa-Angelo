import { describe, expect, it } from 'vitest';
import { isSamePayerIdentity, validatePayerIdentity } from './payerIdentity';

const COMPLETE = {
  bank: 'Banesco',
  phone: '0412-1234567',
  idNumber: 'V12345678',
};

describe('validatePayerIdentity', () => {
  it('acepta los tres datos completos', () => {
    expect(validatePayerIdentity(COMPLETE)).toBeNull();
  });

  it('exige el banco emisor', () => {
    expect(validatePayerIdentity({ ...COMPLETE, bank: '' })).toBe(
      'Selecciona el banco desde el que hiciste la transferencia.',
    );
    expect(validatePayerIdentity({ ...COMPLETE, bank: '   ' })).toMatch(/banco/i);
  });

  it('exige el teléfono', () => {
    expect(validatePayerIdentity({ ...COMPLETE, phone: '' })).toBe(
      'Ingresa el teléfono asociado al pago.',
    );
  });

  it('exige la cédula', () => {
    expect(validatePayerIdentity({ ...COMPLETE, idNumber: '' })).toBe(
      'Ingresa la cédula asociada al pago.',
    );
  });
});

describe('isSamePayerIdentity', () => {
  it('reconoce el mismo conjunto de datos', () => {
    expect(isSamePayerIdentity(COMPLETE, { ...COMPLETE })).toBe(true);
  });

  it('distingue cada campo por separado', () => {
    expect(isSamePayerIdentity(COMPLETE, { ...COMPLETE, bank: 'Mercantil' })).toBe(false);
    expect(isSamePayerIdentity(COMPLETE, { ...COMPLETE, phone: '0414-0000000' })).toBe(false);
    expect(isSamePayerIdentity(COMPLETE, { ...COMPLETE, idNumber: 'V99999999' })).toBe(false);
  });

  it('nunca da por verificados datos sin confirmar', () => {
    expect(isSamePayerIdentity(null, COMPLETE)).toBe(false);
    expect(isSamePayerIdentity(COMPLETE, null)).toBe(false);
  });
});