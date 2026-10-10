import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearSurveyState,
  getSurveyCompletionState,
  markSurveyAnswered,
  markSurveyDismissed,
  shouldAutoShowSurvey,
} from './surveyStorage';

describe('surveyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('no muestra la encuesta automáticamente para un pedido desconocido', () => {
    expect(shouldAutoShowSurvey('order-1')).toBe(true);
    expect(getSurveyCompletionState('order-1')).toBeNull();
  });

  it('marca el pedido como respondido y deja de mostrarla', () => {
    expect(markSurveyAnswered('order-1')).toBe(true);

    expect(getSurveyCompletionState('order-1')).toBe('answered');
    expect(shouldAutoShowSurvey('order-1')).toBe(false);
  });

  it('respeta el aplazamiento ("Ahora no") del cliente', () => {
    expect(markSurveyDismissed('order-1')).toBe(true);

    expect(getSurveyCompletionState('order-1')).toBe('dismissed');
    expect(shouldAutoShowSurvey('order-1')).toBe(false);
  });

  it('la respuesta prevalece sobre el aplazamiento del mismo pedido', () => {
    markSurveyDismissed('order-1');
    markSurveyAnswered('order-1');

    expect(getSurveyCompletionState('order-1')).toBe('answered');
  });

  it('mantiene el estado por pedido de forma independiente', () => {
    markSurveyAnswered('order-1');

    expect(shouldAutoShowSurvey('order-2')).toBe(true);
  });

  it('limita el registro a las 50 encuestas más recientes', () => {
    for (let i = 0; i < 60; i += 1) {
      markSurveyAnswered(`order-${i}`);
    }

    expect(getSurveyCompletionState('order-0')).toBeNull();
    expect(getSurveyCompletionState('order-59')).toBe('answered');
  });

  it('clearSurveyState limpia todo el estado', () => {
    markSurveyAnswered('order-1');
    expect(clearSurveyState()).toBe(true);
    expect(shouldAutoShowSurvey('order-1')).toBe(true);
  });

  it('ignora contenido corrupto en localStorage', () => {
    localStorage.setItem('menugram_order_survey_v1', 'not-json');
    expect(shouldAutoShowSurvey('order-1')).toBe(true);
  });
});
