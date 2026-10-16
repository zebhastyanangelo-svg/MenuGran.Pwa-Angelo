import { describe, expect, it } from 'vitest';
import {
  MAX_INGREDIENTS_PER_DISH,
  addIngredient,
  normalizeIngredient,
  removeIngredient,
  sanitizeIngredientList,
  toggleExcludedIngredient,
} from './ingredients';

describe('ingredients utilities', () => {
  describe('normalizeIngredient', () => {
    it('pone mayúscula inicial y minúsculas al resto', () => {
      expect(normalizeIngredient('TOMATE')).toBe('Tomate');
      expect(normalizeIngredient('tomate')).toBe('Tomate');
      expect(normalizeIngredient('ToMaTe')).toBe('Tomate');
      expect(normalizeIngredient('queso CHEDDAR')).toBe('Queso cheddar');
    });

    it('colapsa espacios sobrantes y recorta', () => {
      expect(normalizeIngredient('  cebolla   morada  ')).toBe('Cebolla morada');
    });

    it('respeta acentos y eñes al subir la primera letra', () => {
      expect(normalizeIngredient('ÁCIDO')).toBe('Ácido');
      expect(normalizeIngredient('ñapa')).toBe('Ñapa');
      expect(normalizeIngredient('JALAPEÑOS')).toBe('Jalapeños');
    });

    it('devuelve cadena vacía cuando no hay texto utilizable', () => {
      expect(normalizeIngredient('   ')).toBe('');
      expect(normalizeIngredient('')).toBe('');
      expect(normalizeIngredient(null)).toBe('');
      expect(normalizeIngredient(undefined)).toBe('');
      expect(normalizeIngredient(42)).toBe('');
    });
  });

  describe('sanitizeIngredientList', () => {
    it('normaliza y deduplica ignorando acentos y mayúsculas', () => {
      expect(
        sanitizeIngredientList(['TOMATE', '  cebolla ', 'Cebolla', 'tomate   ']),
      ).toEqual(['Tomate', 'Cebolla']);
    });

    it('descarta vacíos y valores que no son texto', () => {
      expect(sanitizeIngredientList(['Cebolla', '', '   ', null, 7])).toEqual([
        'Cebolla',
      ]);
    });

    it('devuelve lista vacía si el valor no es un array', () => {
      expect(sanitizeIngredientList(null)).toEqual([]);
      expect(sanitizeIngredientList('Cebolla')).toEqual([]);
      expect(sanitizeIngredientList(undefined)).toEqual([]);
    });

    it('recorta al máximo de ingredientes por platillo', () => {
      const many = Array.from({ length: MAX_INGREDIENTS_PER_DISH + 5 }, (_, i) => `Item ${i}`);

      expect(sanitizeIngredientList(many)).toHaveLength(MAX_INGREDIENTS_PER_DISH);
    });
  });

  describe('addIngredient', () => {
    it('agrega el ingrediente ya normalizado', () => {
      expect(addIngredient(['Queso'], 'TOMATE')).toEqual(['Queso', 'Tomate']);
    });

    it('no duplica ingredientes que solo difieren en mayúsculas o acentos', () => {
      expect(addIngredient(['Cebolla'], 'CEBOLLA')).toEqual(['Cebolla']);
      expect(addIngredient(['Ajo'], '  ajo ')).toEqual(['Ajo']);
    });

    it('ignora entradas vacías y conserva la lista sin mutarla', () => {
      const list = ['Queso'];
      expect(addIngredient(list, '   ')).toEqual(['Queso']);
      expect(list).toEqual(['Queso']);
    });

    it('no crece más allá del máximo permitido', () => {
      const full = Array.from(
        { length: MAX_INGREDIENTS_PER_DISH },
        (_, i) => `Item ${i}`,
      );

      expect(addIngredient(full, 'Extra')).toHaveLength(MAX_INGREDIENTS_PER_DISH);
    });
  });

  describe('removeIngredient', () => {
    it('quita el ingrediente ignorando mayúsculas y acentos', () => {
      expect(removeIngredient(['Queso', 'Cebolla'], 'CEBOLLA')).toEqual(['Queso']);
    });

    it('deja la lista intacta si el ingrediente no está', () => {
      expect(removeIngredient(['Queso'], 'Tomate')).toEqual(['Queso']);
    });
  });

  describe('toggleExcludedIngredient', () => {
    it('marca el ingrediente como excluido la primera vez', () => {
      expect(toggleExcludedIngredient([], 'Cebolla')).toEqual(['Cebolla']);
    });

    it('lo desmarca la segunda vez (tachado de ida y vuelta)', () => {
      const excluded = toggleExcludedIngredient([], 'Cebolla');

      expect(toggleExcludedIngredient(excluded, 'cebolla')).toEqual([]);
    });

    it('no toca la lista original', () => {
      const excluded = ['Cebolla'];

      toggleExcludedIngredient(excluded, 'Tomate');

      expect(excluded).toEqual(['Cebolla']);
    });

    it('ignora ingredientes vacíos', () => {
      expect(toggleExcludedIngredient(['Cebolla'], '  ')).toEqual(['Cebolla']);
    });
  });
});