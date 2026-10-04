/**
 * Búsqueda y navegación de la base de conocimiento de soporte.
 *
 * Funciones puras sobre los datos de `supportFaq`: el widget sólo renderiza.
 * La búsqueda no depende de acentos ni de mayúsculas, porque el usuario
 * escribe "SEGUIMIENTO" o "seguiminto" y espera encontrarlo igual.
 */

import type {
  SupportArticle,
  SupportCategory,
  SupportCategoryId,
  SupportFlow,
  SupportFlowOption,
  SupportFlowStep,
} from '../data/supportFaq';

/** Quita acentos y pasa a minúsculas, para comparar sin sorpresas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getArticleById(articles: readonly SupportArticle[], id: string): SupportArticle | undefined {
  return articles.find((article) => article.id === id);
}

export function getArticlesByCategory(
  articles: readonly SupportArticle[],
  categoryId: SupportCategoryId,
): SupportArticle[] {
  return articles.filter((article) => article.categoryId === categoryId);
}

export function getCategoryById(
  categories: readonly SupportCategory[],
  categoryId: SupportCategoryId,
): SupportCategory | undefined {
  return categories.find((category) => category.id === categoryId);
}

/**
 * Puntúa un artículo contra los términos buscados. Todos deben aparecer
 * (AND), así un resultado siempre responde a lo que se preguntó.
 *
 * La pregunta pesa más que la respuesta, para que "pago" priorice el artículo
 * cuya pregunta habla de pagos.
 */
export function scoreArticle(article: SupportArticle, terms: readonly string[]): number {
  if (terms.length === 0) return 0;

  const question = normalizeText(article.question);
  const answer = normalizeText(article.answer);
  const keywords = normalizeText(article.keywords.join(' '));

  let score = 0;
  for (const term of terms) {
    const inQuestion = question.includes(term);
    const inKeyword = keywords.includes(term);
    const inAnswer = answer.includes(term);

    if (!inQuestion && !inKeyword && !inAnswer) return -1;

    if (inQuestion) score += 3;
    if (inKeyword) score += 2;
    if (inAnswer) score += 1;
  }

  return score;
}

/** Divide la consulta en términos normalizados, descartando vacíos. */
export function parseQuery(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

/**
 * Busca artículos por texto libre. Sin consulta devuelve la lista completa
 * de la categoría indicada, para que el browse por categoría y la búsqueda
 * compartan el mismo componente.
 */
export function searchArticles(
  articles: readonly SupportArticle[],
  query: string,
  categoryId?: SupportCategoryId,
): SupportArticle[] {
  const pool = categoryId === undefined ? articles : getArticlesByCategory(articles, categoryId);
  const terms = parseQuery(query);

  if (terms.length === 0) return [...pool];

  return pool
    .map((article) => ({ article, score: scoreArticle(article, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.article);
}

export function getFlowStep(flow: SupportFlow, stepId: string): SupportFlowStep | undefined {
  return flow.steps[stepId];
}

export function getEntryStep(flow: SupportFlow): SupportFlowStep | undefined {
  return getFlowStep(flow, flow.entryStepId);
}

/** Artículo al que desemboca una opción del flujo, si lo tiene. */
export function resolveFlowOption(
  articles: readonly SupportArticle[],
  option: SupportFlowOption,
): SupportArticle | undefined {
  return option.articleId === undefined ? undefined : getArticleById(articles, option.articleId);
}

/** Artículos relacionados de un artículo, resolviendo los ids y descartando los ausentes. */
export function getRelatedArticles(
  articles: readonly SupportArticle[],
  article: SupportArticle,
): SupportArticle[] {
  const ids = article.relatedIds ?? [];
  return ids
    .map((id) => getArticleById(articles, id))
    .filter((related): related is SupportArticle => related !== undefined);
}