import { describe, expect, it } from 'vitest';
import { haversineDistance, sortByDistance } from './distance';
import type { GeoPoint } from '../types/database';

describe('haversineDistance', () => {
  it('devuelve 0 para el mismo punto', () => {
    const p: GeoPoint = { x: -99.1332, y: 19.4326 };
    expect(haversineDistance(p, p)).toEqual({ km: 0, m: 0 });
  });

  it('calcula la distancia entre dos ciudades (Madrid-México DF ~9060 km)', () => {
    const madrid: GeoPoint = { x: -3.703790, y: 40.416775 };
    const cdmx: GeoPoint = { x: -99.1332, y: 19.4326 };
    const result = haversineDistance(madrid, cdmx);

    expect(result.km).toBeGreaterThan(9050);
    expect(result.km).toBeLessThan(9080);
    expect(result.m).toBeCloseTo(result.km * 1000, 1);
  });

  it('distancia conocida: París → Berlín ~877 km', () => {
    const paris: GeoPoint = { x: 2.3522, y: 48.8566 };
    const berlin: GeoPoint = { x: 13.4050, y: 52.5200 };
    const result = haversineDistance(paris, berlin);

    expect(result.km).toBeGreaterThan(870);
    expect(result.km).toBeLessThan(890);
  });

  it('es simétrica', () => {
    const a: GeoPoint = { x: -3.7, y: 40.4 };
    const b: GeoPoint = { x: 13.4, y: 52.5 };
    expect(haversineDistance(a, b).km).toBeCloseTo(haversineDistance(b, a).km, 6);
  });
});

describe('sortByDistance', () => {
  const origin: GeoPoint = { x: 0, y: 0 };
  const near: GeoPoint = { x: 0.01, y: 0.01 };
  const far: GeoPoint = { x: 10, y: 10 };

  it('ordena de más cercano a más lejano', () => {
    const result = sortByDistance(
      [{ location: far }, { location: near }, { location: origin }],
      origin,
    );
    expect(result[0].location).toEqual(origin);
    expect(result[1].location).toEqual(near);
    expect(result[2].location).toEqual(far);
  });

  it('coloca los sin ubicación al final', () => {
    const result = sortByDistance(
      [{ location: far }, { location: null }, { location: near }],
      origin,
    );
    expect(result[result.length - 1].location).toBeNull();
  });

  it('no muta el arreglo original', () => {
    const items = [{ location: near }, { location: far }];
    const result = sortByDistance(items, origin);
    expect(items).toHaveLength(2);
    expect(result).not.toBe(items);
  });
});
