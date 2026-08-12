import { describe, expect, it } from 'vitest';
import { requiresEmailConfirmation, suggestEmailDomain } from './emailSuggestions';

describe('suggestEmailDomain', () => {
  it('sugiere corrección para @gmai.com', () => {
    expect(suggestEmailDomain('user@gmai.com')).toEqual({
      original: 'gmai.com',
      suggestion: 'user@gmail.com',
    });
  });

  it('sugiere corrección para @hotmial.com', () => {
    expect(suggestEmailDomain('user@hotmial.com')).toEqual({
      original: 'hotmial.com',
      suggestion: 'user@hotmail.com',
    });
  });

  it('sugiere corrección para @outloook.com vía levenshtein', () => {
    expect(suggestEmailDomain('user@outloook.com')).toEqual({
      original: 'outloook.com',
      suggestion: 'user@outlook.com',
    });
  });

  it('no sugiere nada para un dominio correcto', () => {
    expect(suggestEmailDomain('user@gmail.com')).toBeNull();
  });

  it('no sugiere nada para un email inválido', () => {
    expect(suggestEmailDomain('no-email')).toBeNull();
    expect(suggestEmailDomain('user@')).toBeNull();
    expect(suggestEmailDomain('@domain.com')).toBeNull();
  });

  it('preserva el local part en la sugerencia', () => {
    const result = suggestEmailDomain('jane.doe+test@gmai.com');
    expect(result?.suggestion).toBe('jane.doe+test@gmail.com');
  });
});

describe('requiresEmailConfirmation', () => {
  it('retorna true cuando el usuario es null', () => {
    expect(requiresEmailConfirmation(null)).toBe(true);
  });

  it('retorna false cuando email_confirmed_at está presente', () => {
    expect(
      requiresEmailConfirmation({
        id: 'u-1',
        email_confirmed_at: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('retorna false cuando identities está poblado', () => {
    expect(
      requiresEmailConfirmation({
        id: 'u-1',
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      }),
    ).toBe(false);
  });

  it('retorna true cuando no hay confirmación ni identities', () => {
    expect(
      requiresEmailConfirmation({
        id: 'u-1',
        email_confirmed_at: null,
        identities: null,
      }),
    ).toBe(true);
  });
});
