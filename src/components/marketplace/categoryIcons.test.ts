import { describe, expect, it } from 'vitest';
import { resolveCategoryIcon, resolveCategoryIconByName } from './categoryIcons';
import type { MerchantCategory } from '../../types/database';

describe('resolveCategoryIcon', () => {
  it('devuelve un icono específico para cada categoría del dominio', () => {
    const categories: MerchantCategory[] = [
      'Comida rápida',
      'Restaurante',
      'Bebidas',
      'Postres',
      'Repostería',
      'Bodegón',
      'Otro',
    ];

    const icons = categories.map(resolveCategoryIcon);
    icons.forEach((icon) => expect(icon).toBeDefined());
    expect(new Set(icons).size).toBeGreaterThan(1);
  });

  it('cae en un icono por defecto para una categoría desconocida', () => {
    const icon = resolveCategoryIcon('Algo raro' as MerchantCategory);
    expect(icon).toBeDefined();
  });
});

describe('resolveCategoryIconByName', () => {
  it('reconoce categorías por palabras clave', () => {
    expect(resolveCategoryIconByName('Pizzas')).not.toBe(
      resolveCategoryIconByName('Bebidas'),
    );
    expect(resolveCategoryIconByName('Jugos')).toBe(
      resolveCategoryIconByName('Bebidas'),
    );
    expect(resolveCategoryIconByName('Postres')).not.toBe(
      resolveCategoryIconByName('Bebidas'),
    );
  });

  it('es tolerante con mayúsculas y acentos', () => {
    expect(resolveCategoryIconByName('CAFÉ')).toBe(
      resolveCategoryIconByName('Bebidas'),
    );
    expect(resolveCategoryIconByName('repostería')).toBe(
      resolveCategoryIconByName('Repostería'),
    );
  });

  it('devuelve el icono genérico cuando no reconoce la categoría', () => {
    expect(resolveCategoryIconByName('Categoría rara')).toBe(
      resolveCategoryIconByName('Otra cosa rara'),
    );
  });
});