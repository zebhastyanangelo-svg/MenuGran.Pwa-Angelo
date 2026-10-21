import { describe, expect, it } from 'vitest';
import { formatTime, formatTimeRange } from './format';

describe('formatTime', () => {
  it('convierte horas de 24 horas al formato 12 horas con AM/PM', () => {
    expect(formatTime('08:00')).toBe('8:00 AM');
    expect(formatTime('20:00')).toBe('8:00 PM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('13:45')).toBe('1:45 PM');
  });

  it('acepta horas con segundos que devuelve PostgREST ("HH:mm:ss")', () => {
    expect(formatTime('09:00:00')).toBe('9:00 AM');
    expect(formatTime('23:59:59')).toBe('11:59 PM');
  });

  it('formatea objetos Date usando la hora local', () => {
    expect(formatTime(new Date(2026, 9, 5, 8, 0))).toBe('8:00 AM');
    expect(formatTime(new Date(2026, 9, 5, 19, 45))).toBe('7:45 PM');
  });

  it('devuelve cadena vacía para valores nulos y fechas inválidas', () => {
    expect(formatTime(null)).toBe('');
    expect(formatTime(undefined)).toBe('');
    expect(formatTime('')).toBe('');
    expect(formatTime(new Date('fecha-inválida'))).toBe('');
  });

  it('deja pasar sin modificar cadenas que no son horas', () => {
    expect(formatTime('abierto')).toBe('abierto');
  });
});

describe('formatTimeRange', () => {
  it('formatea el rango del día en 12 horas con AM/PM', () => {
    expect(formatTimeRange('08:00', '20:00')).toBe('8:00 AM - 8:00 PM');
    expect(formatTimeRange('09:00:00', '02:00:00')).toBe('9:00 AM - 2:00 AM');
  });

  it('devuelve cadena vacía si falta algún extremo del rango', () => {
    expect(formatTimeRange(null, '20:00')).toBe('');
    expect(formatTimeRange('08:00', null)).toBe('');
    expect(formatTimeRange(undefined, undefined)).toBe('');
  });
});
