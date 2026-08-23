import { describe, expect, it } from 'vitest';
import { parseGeoPoint, parseWkbPoint } from './geoPoint';

/** Construye un WKB hexadecimal little-endian de POINT(lng lat) con SRID 4326,
 * igual al que devuelve PostgREST para columnas geography/geometry. */
function buildWkbHex(lng: number, lat: number): string {
  const buffer = new ArrayBuffer(25);
  const view = new DataView(buffer);
  view.setUint8(0, 1); // little endian
  view.setUint32(1, 0x20000001, true); // POINT + flag SRID
  view.setUint32(5, 4326, true); // SRID 4326
  view.setFloat64(9, lat, true); // Y = latitud
  view.setFloat64(17, lng, true); // X = longitud
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('parseGeoPoint', () => {
  it('parsea objetos { x, y } tal como los escribe la propia PWA', () => {
    expect(parseGeoPoint({ x: -66.9036, y: 10.4806 })).toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('parsea objetos { lat, lng }', () => {
    expect(parseGeoPoint({ lat: 10.4806, lng: -66.9036 })).toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('parsea cadenas POINT(lng lat) de PostGIS', () => {
    expect(parseGeoPoint('POINT(-66.9036 10.4806)')).toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('parsea tuplas (x,y) de PostgREST', () => {
    expect(parseGeoPoint('(-66.9036,10.4806)')).toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('parsea pares sueltos "lng lat"', () => {
    expect(parseGeoPoint('-66.9036 10.4806')).toEqual({
      x: -66.9036,
      y: 10.4806,
    });
  });

  it('decodifica WKB hexadecimal little-endian con SRID', () => {
    const wkb = buildWkbHex(-66.9036, 10.4806);
    expect(wkb.startsWith('0101000020e6100000')).toBe(true);
    expect(parseGeoPoint(wkb)).toEqual({ x: -66.9036, y: 10.4806 });
  });

  it('devuelve null para null, undefined o vacío', () => {
    expect(parseGeoPoint(null)).toBeNull();
    expect(parseGeoPoint(undefined)).toBeNull();
    expect(parseGeoPoint('')).toBeNull();
    expect(parseGeoPoint('   ')).toBeNull();
  });

  it('devuelve null ante cadenas malformadas sin lanzar excepción', () => {
    expect(parseGeoPoint('no-es-una-ubicacion')).toBeNull();
    expect(parseGeoPoint('(abc,def)')).toBeNull();
    expect(parseGeoPoint('POINT()')).toBeNull();
    expect(parseGeoPoint('zzzz-not-hex')).toBeNull();
  });

  it('devuelve null ante objetos sin coordenadas numéricas válidas', () => {
    expect(parseGeoPoint({ foo: 'bar' })).toBeNull();
    expect(parseGeoPoint({ x: Number.NaN, y: 10 })).toBeNull();
    expect(parseGeoPoint([1, 2])).toBeNull();
  });

  it('rechaza coordenadas fuera de rango geográfico', () => {
    expect(parseGeoPoint({ x: 999, y: 10 })).toBeNull();
    expect(parseGeoPoint({ x: -66, y: 91 })).toBeNull();
    expect(parseGeoPoint('POINT(999 10)')).toBeNull();
  });
});

describe('parseWkbPoint', () => {
  it('acepta WKB sin SRID', () => {
    const buffer = new ArrayBuffer(21);
    const view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint32(1, 1, true); // POINT sin flag SRID
    view.setFloat64(5, 8.6, true);
    view.setFloat64(13, -71.15, true);
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(parseWkbPoint(hex)).toEqual({ x: -71.15, y: 8.6 });
  });

  it('devuelve null si el buffer es demasiado corto', () => {
    expect(parseWkbPoint('01010000')).toBeNull();
  });

  it('nunca lanza ante entrada arbitraria', () => {
    expect(parseWkbPoint('not-hex-at-all')).toBeNull();
  });
});
