import { describe, it, expect } from 'vitest';
import { calculateDistanceKm } from '../services/geofencingService';

describe('calculateDistanceKm', () => {
  it('calcula distancia correcta entre dos puntos', () => {
    const coord1 = { latitude: 10.4806, longitude: -66.9036 };
    const coord2 = { latitude: 10.4906, longitude: -66.9136 };

    const distance = calculateDistanceKm(coord1, coord2);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2);
  });

  it('retorna 0 para la misma ubicación', () => {
    const coord = { latitude: 10.4806, longitude: -66.9036 };

    const distance = calculateDistanceKm(coord, coord);

    expect(distance).toBe(0);
  });

  it('calcula distancia mayor para puntos más lejanos', () => {
    const coord1 = { latitude: 10.4806, longitude: -66.9036 };
    const coord2 = { latitude: 10.4906, longitude: -66.9136 };
    const coord3 = { latitude: 11.4806, longitude: -67.9036 };

    const distance1 = calculateDistanceKm(coord1, coord2);
    const distance2 = calculateDistanceKm(coord1, coord3);

    expect(distance2).toBeGreaterThan(distance1);
  });
});
