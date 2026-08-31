import { describe, expect, it } from 'vitest';
import { haversineDistance } from './geo';
import type { GeoPoint } from '../types/database';

describe('haversineDistance', () => {
  it('devuelve 0 para el mismo punto', () => {
    const point: GeoPoint = { x: -66.9036, y: 10.4806 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('calcula distancia conocida Caracas → Maracaibo ≈ 530 km', () => {
    const caracas: GeoPoint = { x: -66.9036, y: 10.4806 };
    const maracaibo: GeoPoint = { x: -71.6073, y: 10.6544 };
    const distancia = haversineDistance(caracas, maracaibo);
    expect(distancia).toBeGreaterThan(510);
    expect(distancia).toBeLessThan(540);
  });

  it('identifica puntos dentro del radio de 1 km', () => {
    const base: GeoPoint = { x: -66.9036, y: 10.4806 };
    const cercano: GeoPoint = { x: -66.904, y: 10.481 };
    expect(haversineDistance(base, cercano)).toBeLessThanOrEqual(1);
  });

  it('identifica puntos fuera del radio de 1 km', () => {
    const base: GeoPoint = { x: -66.9036, y: 10.4806 };
    const lejano: GeoPoint = { x: -66.92, y: 10.5 };
    expect(haversineDistance(base, lejano)).toBeGreaterThan(1);
  });
});
