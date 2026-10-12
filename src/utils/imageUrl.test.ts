import { describe, expect, it } from 'vitest';
import { normalizeImageUrl } from './imageUrl';

describe('normalizeImageUrl', () => {
  it('devuelve la misma URL cuando ya es HTTPS absoluta', () => {
    expect(normalizeImageUrl('https://i.ibb.co/abc/plato.jpg')).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
  });

  it('fuerza HTTPS en URLs http:// de ImgBB (contenido mixto bloqueado en móvil)', () => {
    expect(normalizeImageUrl('http://i.ibb.co/abc/plato.jpg')).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
    expect(normalizeImageUrl('http://ibb.co/abc')).toBe('https://ibb.co/abc');
  });

  it('resuelve URLs relativas al protocolo (//i.ibb.co/...)', () => {
    expect(normalizeImageUrl('//i.ibb.co/abc/plato.jpg')).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
  });

  it('recorta espacios en blanco alrededor de la URL', () => {
    expect(normalizeImageUrl('  https://i.ibb.co/abc/plato.jpg  ')).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
  });

  it('devuelve null para entradas nulas o vacías', () => {
    expect(normalizeImageUrl(null)).toBeNull();
    expect(normalizeImageUrl(undefined)).toBeNull();
    expect(normalizeImageUrl('')).toBeNull();
    expect(normalizeImageUrl('   ')).toBeNull();
  });

  it('devuelve null para URLs que no se pueden parsear', () => {
    expect(normalizeImageUrl('no-es-una-url')).toBeNull();
  });

  it('respeta el esquema de dominios que no son ImgBB', () => {
    expect(normalizeImageUrl('http://cdn.example.com/foto.png')).toBe(
      'http://cdn.example.com/foto.png',
    );
  });
});
