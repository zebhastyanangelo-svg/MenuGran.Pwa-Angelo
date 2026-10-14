import { describe, expect, it } from 'vitest';
import {
  classifyStars,
  classifyRatingRow,
  RATING_CATEGORY_LABELS,
} from './ratingCategories';

describe('classifyStars', () => {
  it('clasifica 4 y 5 estrellas como buenas', () => {
    expect(classifyStars(4)).toBe('good');
    expect(classifyStars(5)).toBe('good');
  });

  it('clasifica 3 estrellas como normal', () => {
    expect(classifyStars(3)).toBe('normal');
  });

  it('clasifica 1 y 2 estrellas como malas', () => {
    expect(classifyStars(1)).toBe('bad');
    expect(classifyStars(2)).toBe('bad');
  });

  it('rechaza valores fuera del rango 1-5', () => {
    expect(classifyStars(0)).toBeNull();
    expect(classifyStars(6)).toBeNull();
    expect(classifyStars(2.5)).toBeNull();
  });
});

describe('classifyRatingRow', () => {
  it('usa la nota del negocio como criterio principal', () => {
    expect(classifyRatingRow({ merchantStars: 2, platformStars: 5 })).toBe('bad');
    expect(classifyRatingRow({ merchantStars: 5, platformStars: 1 })).toBe('good');
  });

  it('usa la nota de la plataforma cuando la del negocio es inválida', () => {
    expect(classifyRatingRow({ merchantStars: 0, platformStars: 3 })).toBe('normal');
  });

  it('devuelve null si ninguna nota es válida', () => {
    expect(classifyRatingRow({ merchantStars: 0, platformStars: 9 })).toBeNull();
  });
});

describe('RATING_CATEGORY_LABELS', () => {
  it('expone etiquetas legibles para cada categoría', () => {
    expect(RATING_CATEGORY_LABELS.good).toBe('Buenas');
    expect(RATING_CATEGORY_LABELS.normal).toBe('Normales');
    expect(RATING_CATEGORY_LABELS.bad).toBe('Malas');
  });
});
