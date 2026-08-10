import { describe, expect, it } from 'vitest';
import {
  validateProductForm,
  validateCategoryForm,
  parsePrice,
  type ProductFormData,
  type CategoryFormData,
} from './productForm';

describe('productForm utilities', () => {
  describe('validateProductForm', () => {
    it('debe validar un producto correcto sin errores', () => {
      const validProduct: ProductFormData = {
        title: 'Hamburguesa Doble',
        description: 'Deliciosa carne con queso',
        price: '12.50',
        category_id: 'cat-123',
        is_available: true,
        image_url: 'https://cloudinary.com/image.jpg',
      };

      const result = validateProductForm(validProduct);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('debe fallar si el título está vacío', () => {
      const product: ProductFormData = {
        title: '   ',
        description: 'Test',
        price: '10.00',
        category_id: 'cat-123',
        is_available: true,
        image_url: null,
      };

      const result = validateProductForm(product);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('El título es obligatorio.');
    });

    it('debe fallar si el precio no es un número positivo válido', () => {
      const productNegative: ProductFormData = {
        title: 'Pizza',
        description: '',
        price: '-5.00',
        category_id: 'cat-123',
        is_available: true,
        image_url: null,
      };

      const resultNeg = validateProductForm(productNegative);
      expect(resultNeg.isValid).toBe(false);
      expect(resultNeg.errors.price).toBe('El precio debe ser un número mayor a 0.');

      const productZero: ProductFormData = {
        ...productNegative,
        price: '0',
      };
      const resultZero = validateProductForm(productZero);
      expect(resultZero.isValid).toBe(false);

      const productInvalid: ProductFormData = {
        ...productNegative,
        price: 'abc',
      };
      const resultInvalid = validateProductForm(productInvalid);
      expect(resultInvalid.isValid).toBe(false);
    });

    it('debe fallar si la categoría no está seleccionada', () => {
      const product: ProductFormData = {
        title: 'Refresco',
        description: null,
        price: '2.00',
        category_id: '',
        is_available: true,
        image_url: null,
      };

      const result = validateProductForm(product);
      expect(result.isValid).toBe(false);
      expect(result.errors.category_id).toBe('Debes seleccionar una categoría.');
    });
  });

  describe('validateCategoryForm', () => {
    it('debe validar una categoría correcta', () => {
      const validCategory: CategoryFormData = {
        name: ' Bebidas ',
        sort_order: 1,
      };

      const result = validateCategoryForm(validCategory);
      expect(result.isValid).toBe(true);
    });

    it('debe rechazar categorías sin nombre o con sort_order negativo', () => {
      const invalidCategory: CategoryFormData = {
        name: '',
        sort_order: -1,
      };

      const result = validateCategoryForm(invalidCategory);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('El nombre de la categoría es obligatorio.');
      expect(result.errors.sort_order).toBe('El orden debe ser un número entero mayor o igual a 0.');
    });
  });

  describe('parsePrice', () => {
    it('debe formatear/parsear precios válidos', () => {
      expect(parsePrice('10.5')).toBe('10.50');
      expect(parsePrice(12)).toBe('12.00');
      expect(parsePrice('invalid')).toBe(null);
      expect(parsePrice(-1)).toBe(null);
    });
  });
});
