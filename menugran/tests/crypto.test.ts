import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, maskPhone } from '@/lib/crypto';

describe('verifyPin', () => {
  it('acepta un PIN válido de 4 dígitos', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('1234', hash)).resolves.toBe(true);
  });

  it('rechaza un PIN de longitud incorrecta (3 dígitos)', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('123', hash)).resolves.toBe(false);
  });

  it('rechaza un PIN de longitud incorrecta (5 dígitos)', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('12345', hash)).resolves.toBe(false);
  });

  it('rechaza un PIN con caracteres no numéricos', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('12a4', hash)).resolves.toBe(false);
  });

  it('rechaza un PIN vacío', async () => {
    const hash = await hashPin('1234');
    await expect(verifyPin('', hash)).resolves.toBe(false);
  });

  it('rechaza cuando el hash es null/undefined', async () => {
    await expect(verifyPin('1234', '')).resolves.toBe(false);
    await expect(verifyPin('1234', null as unknown as string)).resolves.toBe(
      false
    );
  });

  it('rechaza el PIN correcto pero con hash de otro PIN', async () => {
    const hash = await hashPin('9999');
    await expect(verifyPin('1234', hash)).resolves.toBe(false);
  });

  it('no lanza excepción con entradas no string (PIN numérico)', async () => {
    const hash = await hashPin('1234');
    await expect(
      verifyPin(1234 as unknown as string, hash)
    ).resolves.toBe(false);
  });
});

describe('hashPin', () => {
  it('genera un hash bcrypt distinto para cada PIN', async () => {
    const h1 = await hashPin('1234');
    const h2 = await hashPin('1234');
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe('1234');
  });
});

describe('maskPhone', () => {
  it('enmascara los últimos 4 dígitos visibles', () => {
    expect(maskPhone('3001234567')).toBe('******4567');
  });

  it('devuelve "No registrado" si no hay teléfono', () => {
    expect(maskPhone(null)).toBe('No registrado');
    expect(maskPhone(undefined)).toBe('No registrado');
  });

  it('enmascara todo si el teléfono tiene menos de 4 dígitos', () => {
    expect(maskPhone('12')).toBe('**');
  });
});
