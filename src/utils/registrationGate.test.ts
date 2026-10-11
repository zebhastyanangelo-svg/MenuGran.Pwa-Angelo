import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '../types/database';
import { buildRegistrationPrefillQuery, isRegistrationIncomplete } from './registrationGate';

function buildProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'Usuario',
    avatar_url: null,
    role: 'customer',
    registration_completed: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: { full_name: 'Usuario' },
    ...overrides,
  } as unknown as User;
}

describe('isRegistrationIncomplete', () => {
  it('devuelve false cuando no hay sesión activa', () => {
    expect(isRegistrationIncomplete(null, null)).toBe(false);
    expect(isRegistrationIncomplete(buildProfile(), null)).toBe(false);
  });

  it('devuelve true cuando la sesión no tiene perfil en la base de datos', () => {
    expect(isRegistrationIncomplete(null, buildUser())).toBe(true);
  });

  it('devuelve true para un cliente que entró por Google sin completar el registro', () => {
    const profile = buildProfile({ registration_completed: false });
    expect(isRegistrationIncomplete(profile, buildUser())).toBe(true);
  });

  it('devuelve false para un cliente que ya completó el registro', () => {
    const profile = buildProfile({ registration_completed: true });
    expect(isRegistrationIncomplete(profile, buildUser())).toBe(false);
  });

  it('devuelve false para roles corporativos aunque falten datos', () => {
    const profile = buildProfile({ role: 'merchant_owner', registration_completed: false });
    expect(isRegistrationIncomplete(profile, buildUser())).toBe(false);
  });
});

describe('buildRegistrationPrefillQuery', () => {
  it('incluye complete, email y nombre codificados', () => {
    const query = buildRegistrationPrefillQuery(
      buildUser({ email: 'nuevo@gmail.com', user_metadata: { full_name: 'Nuevo Usuario' } }),
      null,
      null,
    );
    expect(query).toBe('?complete=1&email=nuevo%40gmail.com&name=Nuevo+Usuario');
  });

  it('preserva la ruta from actual', () => {
    const params = new URLSearchParams({ from: '/orders/o-1' });
    const query = buildRegistrationPrefillQuery(buildUser(), null, params);
    expect(query).toContain('from=%2Forders%2Fo-1');
  });

  it('omite el nombre cuando la sesión no lo provee', () => {
    const query = buildRegistrationPrefillQuery(
      buildUser({ user_metadata: {} }),
      null,
      null,
    );
    expect(query).not.toContain('name=');
  });

  it('recupera el nombre del perfil como respaldo', () => {
    const query = buildRegistrationPrefillQuery(
      buildUser({ user_metadata: {} }),
      buildProfile({ full_name: 'Nombre del Perfil' }),
      null,
    );
    expect(query).toContain('name=Nombre+del+Perfil');
  });
});
