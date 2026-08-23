/**
 * Parseo defensivo del campo `location` de merchants tal como lo devuelve
 * PostgreSQL/PostgREST. Según la configuración de la columna PostGIS, la API
 * puede entregar una cadena `POINT(lng lat)`, `(x,y)`, WKB hexadecimal, un
 * objeto `{ x, y }`, `{ lat, lng }` o null. Nunca lanza: ante cualquier
 * formato inválido devuelve `null`.
 */
import type { GeoPoint } from '../types/database';

const LAT_RANGE: Readonly<[number, number]> = [-90, 90];
const LNG_RANGE: Readonly<[number, number]> = [-180, 180];
const POINT_PREFIX = /^point\s*\(\s*(\S+)\s+(\S+)\s*\)$/i;
const TUPLE_PREFIX = /^\(\s*(\S+)\s*,\s*(\S+)\s*\)$/;
const PAIR_PATTERN =
  /^([-+]?\d+(?:\.\d+)?)\s*[,\s]\s*([-+]?\d+(?:\.\d+)?)$/;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    point.y >= LAT_RANGE[0] &&
    point.y <= LAT_RANGE[1] &&
    point.x >= LNG_RANGE[0] &&
    point.x <= LNG_RANGE[1]
  );
}

function buildPoint(lngCandidate: unknown, latCandidate: unknown): GeoPoint | null {
  if (!isFiniteNumber(lngCandidate) || !isFiniteNumber(latCandidate)) {
    return null;
  }
  const point: GeoPoint = { x: lngCandidate, y: latCandidate };
  return isValidGeoPoint(point) ? point : null;
}

/** Interpreta objetos `{ x, y }` o `{ lat, lng }`. */
function parseObjectShape(raw: Record<string, unknown>): GeoPoint | null {
  if (isFiniteNumber(raw.x) || isFiniteNumber(raw.y)) {
    return buildPoint(raw.x, raw.y);
  }
  if (isFiniteNumber(raw.lng) || isFiniteNumber(raw.lat)) {
    return buildPoint(raw.lng, raw.lat);
  }
  return null;
}

/**
 * Interpreta cadenas: `POINT(lng lat)` de PostGIS, tuplas `(x,y)` de
 * PostgREST y pares sueltos `lng lat`.
 */
function parseStringShape(raw: string): GeoPoint | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const pointMatch = POINT_PREFIX.exec(trimmed);
  if (pointMatch !== null) {
    return buildPoint(Number(pointMatch[1]), Number(pointMatch[2]));
  }

  const tupleMatch = TUPLE_PREFIX.exec(trimmed);
  if (tupleMatch !== null) {
    return buildPoint(Number(tupleMatch[1]), Number(tupleMatch[2]));
  }

  const pairMatch = PAIR_PATTERN.exec(trimmed);
  if (pairMatch !== null) {
    return buildPoint(Number(pairMatch[1]), Number(pairMatch[2]));
  }

  return null;
}

/** Decodifica una cadena hexadecimal en bytes binarios (o null si es inválida). */
function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Decodifica WKB hexadecimal de un POINT (con o sin SRID, little/big endian):
 * `[order][type][srid?][y:float64][x:float64]`.
 */
export function parseWkbPoint(hex: string): GeoPoint | null {
  try {
    const bytes = hexToBytes(hex.trim());
    if (bytes === null || bytes.length < 21) return null;

    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );
    const littleEndian = view.getUint8(0) === 1;
    const flags = view.getUint32(1, littleEndian);
    const hasSrid = (flags & 0x20000000) !== 0;
    const coordsOffset = hasSrid ? 9 : 5;
    if (bytes.length < coordsOffset + 16) return null;

    const y = view.getFloat64(coordsOffset, littleEndian);
    const x = view.getFloat64(coordsOffset + 8, littleEndian);
    return buildPoint(x, y);
  } catch {
    return null;
  }
}

/**
 * Convierte cualquier representación de ubicación devuelta por el backend
 * en un `GeoPoint` seguro, o `null` si el formato es desconocido/inválido.
 */
export function parseGeoPoint(raw: unknown): GeoPoint | null {
  try {
    if (raw === null || raw === undefined) return null;

    if (typeof raw === 'string') {
      if (/^[0-9a-f]{42,}$/i.test(raw)) {
        return parseWkbPoint(raw);
      }
      return parseStringShape(raw);
    }

    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return parseObjectShape(raw as Record<string, unknown>);
    }

    return null;
  } catch {
    return null;
  }
}
