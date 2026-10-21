import { describe, expect, it } from 'vitest';
import {
  isImgbbViewerUrl,
  normalizeImageUrl,
  resolveImageVersionToken,
  withImageCacheVersion,
} from './imageUrl';

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

  it('devuelve null para URLs blob: (objetos efímeros que solo viven en la sesión de origen)', () => {
    expect(normalizeImageUrl('blob:https://menugran.app/7c9e6679-42')).toBeNull();
    expect(normalizeImageUrl('blob:http://localhost:5173/abc-123')).toBeNull();
  });

  it('devuelve null para URLs data: (esquema opaco que falla en decodificadores móviles)', () => {
    expect(normalizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
  });

  it('devuelve null para objetos serializados por error (p. ej. [object Object])', () => {
    expect(normalizeImageUrl('[object Object]')).toBeNull();
    expect(normalizeImageUrl('{"url":"https://i.ibb.co/a.jpg"}')).toBeNull();
  });

  it('respeta el esquema de dominios que no son ImgBB', () => {
    expect(normalizeImageUrl('http://cdn.example.com/foto.png')).toBe(
      'http://cdn.example.com/foto.png',
    );
  });
});

describe('isImgbbViewerUrl', () => {
  it('detecta las páginas del visor HTML de ImgBB (ibb.co/<id>)', () => {
    expect(isImgbbViewerUrl('https://ibb.co/xyz123')).toBe(true);
    expect(isImgbbViewerUrl('https://www.ibb.co/xyz123')).toBe(true);
  });

  it('acepta URLs directas del CDN de ImgBB (i.ibb.co)', () => {
    expect(isImgbbViewerUrl('https://i.ibb.co/abc/plato.jpg')).toBe(false);
  });

  it('acepta URLs de dominios ajenos a ImgBB', () => {
    expect(isImgbbViewerUrl('https://cdn.example.com/foto.png')).toBe(false);
  });

  it('devuelve false para URLs que no se pueden parsear', () => {
    expect(isImgbbViewerUrl('no-es-una-url')).toBe(false);
    expect(isImgbbViewerUrl('')).toBe(false);
  });
});

describe('resolveImageVersionToken', () => {
  it('convierte marcas de tiempo ISO a epoch en milisegundos', () => {
    expect(resolveImageVersionToken('2026-10-20T20:20:20.000Z')).toBe(
      String(Date.parse('2026-10-20T20:20:20.000Z')),
    );
  });

  it('mantiene los valores numéricos tal cual (sin decimales)', () => {
    expect(resolveImageVersionToken(1761000000000)).toBe('1761000000000');
    expect(resolveImageVersionToken(12.9)).toBe('12');
  });

  it('usa el texto recortado cuando no es una marca de tiempo', () => {
    expect(resolveImageVersionToken('  v2  ')).toBe('v2');
  });

  it('devuelve null cuando no hay versión utilizable', () => {
    expect(resolveImageVersionToken(null)).toBeNull();
    expect(resolveImageVersionToken(undefined)).toBeNull();
    expect(resolveImageVersionToken('')).toBeNull();
    expect(resolveImageVersionToken('   ')).toBeNull();
    expect(resolveImageVersionToken(Number.NaN)).toBeNull();
  });
});

describe('withImageCacheVersion', () => {
  it('añade el parámetro de versión a la URL de la imagen', () => {
    expect(withImageCacheVersion('https://i.ibb.co/abc/plato.jpg', '1761000000000')).toBe(
      'https://i.ibb.co/abc/plato.jpg?v=1761000000000',
    );
  });

  it('conserva los parámetros que ya trae la URL', () => {
    expect(
      withImageCacheVersion('https://cdn.example.com/foto.png?w=200', 'v1'),
    ).toBe('https://cdn.example.com/foto.png?w=200&v=v1');
  });

  it('reemplaza una versión anterior en lugar de duplicarla', () => {
    expect(
      withImageCacheVersion('https://cdn.example.com/foto.png?v=antigua', 'nueva'),
    ).toBe('https://cdn.example.com/foto.png?v=nueva');
  });

  it('mantiene el fragmento al final de la URL', () => {
    expect(
      withImageCacheVersion('https://cdn.example.com/foto.png#anchor', 'v1'),
    ).toBe('https://cdn.example.com/foto.png?v=v1#anchor');
  });

  it('devuelve la URL intacta cuando no hay versión', () => {
    expect(withImageCacheVersion('https://i.ibb.co/abc/plato.jpg', null)).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
    expect(withImageCacheVersion('https://i.ibb.co/abc/plato.jpg', undefined)).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
    expect(withImageCacheVersion('https://i.ibb.co/abc/plato.jpg', '  ')).toBe(
      'https://i.ibb.co/abc/plato.jpg',
    );
  });

  it('no versiona esquemas opacos que se corromperían con query string', () => {
    expect(withImageCacheVersion('data:image/png;base64,AAAA', 'v1')).toBe(
      'data:image/png;base64,AAAA',
    );
    expect(withImageCacheVersion('blob:https://app.example.com/1234', 'v1')).toBe(
      'blob:https://app.example.com/1234',
    );
  });

  it('devuelve la URL intacta cuando no se puede parsear', () => {
    expect(withImageCacheVersion('no-es-una-url', 'v1')).toBe('no-es-una-url');
  });
});
