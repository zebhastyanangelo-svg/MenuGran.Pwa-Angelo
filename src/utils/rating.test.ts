import { describe, expect, it } from 'vitest';
import {
  RATING_MAX_STARS,
  fullStarsForRating,
  hasVisibleRating,
  ratingToPercent,
} from './rating';
import type { RatingSummary } from '../services/orderRatingService';

describe('fullStarsForRating', () => {
  it('redondea el promedio a la estrella llena más cercana (estilo hotel)', () => {
    expect(fullStarsForRating(4.5)).toBe(5);
    expect(fullStarsForRating(4.4)).toBe(4);
    expect(fullStarsForRating(3)).toBe(3);
    expect(fullStarsForRating(0.4)).toBe(0);
  });

  it('limita el resultado entre 0 y 5 estrellas', () => {
    expect(fullStarsForRating(7)).toBe(5);
    expect(fullStarsForRating(-2)).toBe(0);
  });

  it('devuelve 0 estrellas para promedios no finitos', () => {
    expect(fullStarsForRating(Number.NaN)).toBe(0);
    expect(fullStarsForRating(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('ratingToPercent', () => {
  it('convierte el promedio sobre 5 en un porcentaje 0-100', () => {
    expect(ratingToPercent(5)).toBe(100);
    expect(ratingToPercent(4.5)).toBe(90);
    expect(ratingToPercent(3.34)).toBe(67);
    expect(ratingToPercent(0)).toBe(0);
  });

  it('acota el porcentaje dentro del rango 0-100', () => {
    expect(ratingToPercent(9)).toBe(100);
    expect(ratingToPercent(-1)).toBe(0);
  });

  it('devuelve 0 % para promedios no finitos', () => {
    expect(ratingToPercent(Number.NaN)).toBe(0);
  });
});

describe('hasVisibleRating', () => {
  it('oculta el badge cuando no hay resumen o no hay valoraciones', () => {
    expect(hasVisibleRating(null)).toBe(false);
    expect(hasVisibleRating(undefined)).toBe(false);
    const empty: RatingSummary = { average: 0, count: 0 };
    expect(hasVisibleRating(empty)).toBe(false);
  });

  it('muestra el badge con al menos una valoración', () => {
    const rated: RatingSummary = { average: 4, count: 12 };
    expect(hasVisibleRating(rated)).toBe(true);
  });

  it('expone la escala máxima de 5 estrellas', () => {
    expect(RATING_MAX_STARS).toBe(5);
  });
});
