/**
 * El lector de QR depende por completo de que el despliegue permita la cámara.
 *
 * `Permissions-Policy: camera=()` no desactiva una función concreta: retira el
 * permiso al origen completo, así que `getUserMedia` se rechaza siempre con
 * `NotAllowedError` aunque el usuario lo conceda y haya https. Es un fallo
 * silencioso —el código de la app es correcto y sus pruebas pasan— que solo se
 * manifiesta en producción, por eso se fija aquí con una prueba.
 */

import { describe, expect, it } from 'vitest';
import vercelConfig from '../../vercel.json';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const rules = vercelConfig.headers as HeaderRule[];

function findCatchAllRule(): HeaderRule {
  const rule = rules.find((entry) => entry.source === '/(.*)');
  if (rule === undefined) {
    throw new Error('vercel.json no define la regla de cabeceras /(.*)');
  }
  return rule;
}

function readPolicy(): string {
  const header = findCatchAllRule().headers.find(
    (entry) => entry.key.toLowerCase() === 'permissions-policy',
  );
  if (header === undefined) {
    throw new Error('vercel.json no define Permissions-Policy');
  }
  return header.value;
}

describe('vercel.json — Permissions-Policy', () => {
  it('permite la cámara al propio origen (el lector de QR la necesita)', () => {
    expect(readPolicy()).toContain('camera=(self)');
  });

  it('no revoca la cámara con una lista vacía', () => {
    expect(readPolicy()).not.toMatch(/camera=\(\s*\)/);
  });

  it('mantiene el micrófono bloqueado: la app no graba audio', () => {
    expect(readPolicy()).toContain('microphone=()');
  });

  it('mantiene la geolocalización restringida al propio origen', () => {
    expect(readPolicy()).toContain('geolocation=(self)');
  });
});