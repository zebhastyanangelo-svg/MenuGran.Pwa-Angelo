import { describe, expect, it } from 'vitest';
import {
  SUPPORT_ARTICLES,
  SUPPORT_CATEGORIES,
  SUPPORT_FLOW,
  type SupportArticle,
} from '../data/supportFaq';
import {
  getArticleById,
  getArticlesByCategory,
  getCategoryById,
  getEntryStep,
  getFlowStep,
  getRelatedArticles,
  normalizeText,
  parseQuery,
  resolveFlowOption,
  scoreArticle,
  searchArticles,
} from './supportSearch';

const ARTICLES = SUPPORT_ARTICLES;

describe('normalizeText', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizeText('Pago Móvil')).toBe('pago movil');
    expect(normalizeText('SEGUIMIENTO')).toBe('seguimiento');
  });

  it('deja intacto el texto sin acentos', () => {
    expect(normalizeText('delivery')).toBe('delivery');
  });
});

describe('parseQuery', () => {
  it('divide la consulta en términos normalizados', () => {
    expect(parseQuery('Pago Móvil')).toEqual(['pago', 'movil']);
  });

  it('descarta términos de un solo carácter', () => {
    expect(parseQuery('a pago')).toEqual(['pago']);
  });

  it('devuelve lista vacía para consultas en blanco', () => {
    expect(parseQuery('')).toEqual([]);
    expect(parseQuery('   ')).toEqual([]);
  });
});

describe('getArticleById', () => {
  it('encuentra un artículo por su id', () => {
    expect(getArticleById(ARTICLES, 'order-status')?.categoryId).toBe('orders');
  });

  it('devuelve undefined si no existe', () => {
    expect(getArticleById(ARTICLES, 'no-existe')).toBeUndefined();
  });
});

describe('getArticlesByCategory', () => {
  it('filtra por categoría', () => {
    const articles = getArticlesByCategory(ARTICLES, 'payments');

    expect(articles.length).toBeGreaterThan(0);
    expect(articles.every((article) => article.categoryId === 'payments')).toBe(true);
  });

  it('devuelve lista vacía para una categoría sin artículos', () => {
    expect(getArticlesByCategory([], 'orders')).toEqual([]);
  });
});

describe('getCategoryById', () => {
  it('encuentra la categoría', () => {
    expect(getCategoryById(SUPPORT_CATEGORIES, 'delivery')?.label).toBe('Entregas');
  });

  it('devuelve undefined si no existe', () => {
    // Se castea porque la prueba justamente exercise un id fuera del dominio.
    expect(getCategoryById(SUPPORT_CATEGORIES, 'inventado' as never)).toBeUndefined();
  });
});

describe('searchArticles', () => {
  it('encuentra por palabras de la pregunta', () => {
    const results = searchArticles(ARTICLES, 'cancelar pedido');

    expect(results.map((article) => article.id)).toContain('order-cancel');
  });

  it('encuentra por keywords que no están en la pregunta', () => {
    // "repartidor" no aparece en la pregunta de delivery-no-show.
    const results = searchArticles(ARTICLES, 'repartidor');
    expect(results.map((article) => article.id)).toContain('delivery-no-show');
  });

  it('ignora acentos y mayúsculas', () => {
    const results = searchArticles(ARTICLES, 'MÓVIL');

    expect(results.map((article) => article.id)).toContain('payment-pending');
  });

  it('devuelve todos los artículos si la consulta está vacía', () => {
    expect(searchArticles(ARTICLES, '')).toHaveLength(ARTICLES.length);
  });

  it('devuelve vacío si nada coincide', () => {
    expect(searchArticles(ARTICLES, 'helicoptero')).toEqual([]);
  });

  it('exige que todos los términos aparezcan (AND)', () => {
    // "pago" aparece en varios artículos; "helicoptero" en ninguno.
    expect(searchArticles(ARTICLES, 'pago helicoptero')).toEqual([]);
  });

  it('filtra por categoría y consulta a la vez', () => {
    const results = searchArticles(ARTICLES, 'pago', 'payments');

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((article) => article.categoryId === 'payments')).toBe(true);
  });

  it('sin consulta, listar una categoría devuelve sólo esa categoría', () => {
    const results = searchArticles(ARTICLES, '', 'menu');

    expect(results.every((article) => article.categoryId === 'menu')).toBe(true);
  });

  it('prioriza el artículo cuya pregunta coincide con la consulta', () => {
    const results = searchArticles(ARTICLES, 'notificaciones');

    expect(results[0]?.categoryId).toBe('notifications');
  });

  it('no muta el array original', () => {
    const before = [...ARTICLES];
    searchArticles(ARTICLES, 'pago');
    expect(ARTICLES).toEqual(before);
  });
});

describe('scoreArticle', () => {
  const article: SupportArticle = {
    id: 'test',
    categoryId: 'orders',
    question: '¿Cómo cancelo un pedido?',
    answer: 'Pulsa el botón de cancelar.',
    keywords: ['anular'],
  };

  it('devuelve 0 sin términos', () => {
    expect(scoreArticle(article, [])).toBe(0);
  });

  it('devuelve -1 si algún término no aparece en absoluto', () => {
    expect(scoreArticle(article, ['cancelo', 'inventado'])).toBe(-1);
  });

  it('puntúa más alto la coincidencia en la pregunta', () => {
    const inQuestion = scoreArticle(article, ['cancelo']);
    const inAnswer = scoreArticle(article, ['pulsa']);
    expect(inQuestion).toBeGreaterThan(inAnswer);
  });

  it('acumula la puntuación de varios términos', () => {
    expect(scoreArticle(article, ['cancelo', 'pulsa'])).toBeGreaterThan(
      scoreArticle(article, ['cancelo']),
    );
  });
});

describe('flujo guiado', () => {
  it('tiene un paso de entrada resoluble', () => {
    const entry = getEntryStep(SUPPORT_FLOW);

    expect(entry).toBeDefined();
    expect(entry?.options.length).toBeGreaterThan(0);
  });

  it('el paso de entrada ofrece opciones', () => {
    const entry = getEntryStep(SUPPORT_FLOW);

    expect(entry?.question).toBeTruthy();
    expect(entry?.options.every((option) => option.label !== '')).toBe(true);
  });

  it('toda opción lleva a un paso existente o a un artículo real', () => {
    for (const step of Object.values(SUPPORT_FLOW.steps)) {
      for (const option of step.options) {
        const nextStepExists =
          option.nextStepId !== undefined && SUPPORT_FLOW.steps[option.nextStepId] !== undefined;
        const articleExists =
          option.articleId !== undefined && getArticleById(ARTICLES, option.articleId) !== undefined;

        expect(nextStepExists || articleExists).toBe(true);
      }
    }
  });

  it('no tiene pasos huérfanos', () => {
    for (const step of Object.values(SUPPORT_FLOW.steps)) {
      for (const option of step.options) {
        if (option.nextStepId !== undefined) {
          expect(SUPPORT_FLOW.steps[option.nextStepId]).toBeDefined();
        }
      }
    }
  });

  it('todo artículo referenciado por el flujo existe', () => {
    for (const step of Object.values(SUPPORT_FLOW.steps)) {
      for (const option of step.options) {
        if (option.articleId !== undefined) {
          expect(getArticleById(ARTICLES, option.articleId)).toBeDefined();
        }
      }
    }
  });

  it('getFlowStep devuelve el paso solicitado', () => {
    expect(getFlowStep(SUPPORT_FLOW, 'order_state')?.question).toBe(
      '¿En qué punto está el pedido?',
    );
  });

  it('getFlowStep devuelve undefined para un paso inexistente', () => {
    expect(getFlowStep(SUPPORT_FLOW, 'nope')).toBeUndefined();
  });

  it('resolveFlowOption encuentra el artículo destino', () => {
    const option = { id: 'o1', label: 'Cancelar', articleId: 'order-cancel' };

    expect(resolveFlowOption(ARTICLES, option)?.id).toBe('order-cancel');
  });

  it('resolveFlowOption devuelve undefined si la opción no lleva a artículo', () => {
    const option = { id: 'o1', label: 'Siguiente', nextStepId: 'menu_state' };

    expect(resolveFlowOption(ARTICLES, option)).toBeUndefined();
  });
});

describe('getRelatedArticles', () => {
  it('resuelve los artículos relacionados', () => {
    const article = getArticleById(ARTICLES, 'order-status');
    const related = getRelatedArticles(ARTICLES, article as SupportArticle);

    expect(related.length).toBeGreaterThan(0);
    expect(related.map((item) => item.id)).toContain('order-stuck');
  });

  it('devuelve vacío si el artículo no tiene relacionados', () => {
    const article = getArticleById(ARTICLES, 'delivery-fee');

    expect(getRelatedArticles(ARTICLES, article as SupportArticle)).toEqual([]);
  });

  it('todos los relatedIds de la base apuntan a artículos reales', () => {
    for (const article of ARTICLES) {
      for (const id of article.relatedIds ?? []) {
        expect(getArticleById(ARTICLES, id)).toBeDefined();
      }
    }
  });
});

describe('integridad de la base de conocimiento', () => {
  it('no hay ids de artículo duplicados', () => {
    const ids = ARTICLES.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda categoría declarada tiene al menos un artículo', () => {
    for (const category of SUPPORT_CATEGORIES) {
      expect(getArticlesByCategory(ARTICLES, category.id).length).toBeGreaterThan(0);
    }
  });

  it('no hay artículos huérfanos de categoría', () => {
    const categoryIds = SUPPORT_CATEGORIES.map((category) => category.id);
    for (const article of ARTICLES) {
      expect(categoryIds).toContain(article.categoryId);
    }
  });

  it('toda pregunta y respuesta tiene contenido', () => {
    for (const article of ARTICLES) {
      expect(article.question.trim()).not.toBe('');
      expect(article.answer.trim()).not.toBe('');
    }
  });
});