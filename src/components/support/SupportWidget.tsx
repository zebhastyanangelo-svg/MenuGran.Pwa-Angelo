/**
 * Botón flotante de soporte.
 *
 * Panel local con tres modos: flujo guiado (triage), búsqueda libre y
 * navegación por categoría. Todo el contenido viene de `supportFaq`, así que
 * funciona sin red y no envía la conversación a ningún proveedor externo.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
  MessageCircleQuestion,
  Search,
  Send,
  X,
} from 'lucide-react';
import {
  SUPPORT_ARTICLES,
  SUPPORT_CATEGORIES,
  SUPPORT_FLOW,
  type SupportArticle,
  type SupportCategoryId,
  type SupportFlowOption,
} from '../../data/supportFaq';
import {
  getCategoryById,
  getFlowStep,
  getRelatedArticles,
  resolveFlowOption,
  searchArticles,
} from '../../utils/supportSearch';
import { FLOATING_ACTION_CLASS, FLOATING_PANEL_CLASS } from '../layout/floatingActions';

type ViewMode = 'home' | 'flow' | 'search';

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('home');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<SupportCategoryId | null>(null);
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [flowStepId, setFlowStepId] = useState<string | null>(null);

  const openArticle = (article: SupportArticle): void => {
    setOpenArticleId(article.id);
  };

  const resetToHome = (): void => {
    setView('home');
    setQuery('');
    setCategoryId(null);
    setOpenArticleId(null);
    setFlowStepId(null);
  };

  const startFlow = (): void => {
    setView('flow');
    setOpenArticleId(null);
    setFlowStepId(SUPPORT_FLOW.entryStepId);
  };

  const visibleArticles = useMemo(
    () => searchArticles(SUPPORT_ARTICLES, query, categoryId ?? undefined),
    [categoryId, query],
  );

  const openArticleData =
    openArticleId === null ? undefined : SUPPORT_ARTICLES.find((a) => a.id === openArticleId);

  const relatedArticles = useMemo(
    () => (openArticleData === undefined ? [] : getRelatedArticles(SUPPORT_ARTICLES, openArticleData)),
    [openArticleData],
  );

  const close = useCallback(() => setIsOpen(false), []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir ayuda y soporte"
        data-testid="support-fab"
        className={`${FLOATING_ACTION_CLASS} inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-white shadow-lg transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2`}
      >
        <LifeBuoy className="h-6 w-6" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={`${FLOATING_PANEL_CLASS} flex h-[min(560px,calc(100vh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
      <header className="flex items-center justify-between gap-2 bg-brand-red px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          {view !== 'home' && (
            <button
              type="button"
              onClick={resetToHome}
              aria-label="Volver al inicio de la ayuda"
              className="rounded-md p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <h2 className="text-base font-semibold">Ayuda y soporte</h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar ayuda"
          className="rounded-md p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {openArticleData !== undefined ? (
          <ArticleView
            article={openArticleData}
            relatedArticles={relatedArticles}
            onOpenArticle={openArticle}
          />
        ) : view === 'flow' ? (
          <FlowView
            stepId={flowStepId ?? SUPPORT_FLOW.entryStepId}
            onChoose={(option) => {
              if (option.articleId !== undefined) {
                const article = resolveFlowOption(SUPPORT_ARTICLES, option);
                if (article !== undefined) openArticle(article);
                return;
              }
              if (option.nextStepId !== undefined) setFlowStepId(option.nextStepId);
            }}
            onBack={() => resetToHome()}
          />
        ) : view === 'home' ? (
          <HomeView
            onStartFlow={startFlow}
            onPickCategory={(id) => {
              setCategoryId(id);
              setView('search');
            }}
          />
        ) : (
          <SearchView
            query={query}
            onQueryChange={setQuery}
            articles={visibleArticles}
            categoryId={categoryId}
            onOpenArticle={openArticle}
            onClearCategory={() => setCategoryId(null)}
          />
        )}
      </div>
    </div>
  );
}

function HomeView({
  onStartFlow,
  onPickCategory,
}: {
  onStartFlow: () => void;
  onPickCategory: (id: SupportCategoryId) => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onStartFlow}
        className="flex w-full items-center gap-3 rounded-xl border border-brand-red/30 bg-red-50 p-3 text-left transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        <MessageCircleQuestion className="h-6 w-6 shrink-0 text-brand-red" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-900">¿Qué necesitas?</span>
          <span className="block text-xs text-slate-600">
            Responde unas preguntas y te llevamos a la solución.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-brand-red" aria-hidden="true" />
      </button>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Explora por tema
        </h3>
        <ul className="space-y-1">
          {SUPPORT_CATEGORIES.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onPickCategory(category.id)}
                className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {category.label}
                  </span>
                  <span className="block text-xs text-slate-500">{category.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SearchView({
  query,
  onQueryChange,
  articles,
  categoryId,
  onOpenArticle,
  onClearCategory,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  articles: readonly SupportArticle[];
  categoryId: SupportCategoryId | null;
  onOpenArticle: (article: SupportArticle) => void;
  onClearCategory: () => void;
}) {
  const category = categoryId === null ? undefined : getCategoryById(SUPPORT_CATEGORIES, categoryId);

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar en la ayuda</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar una duda..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
        />
      </label>

      {category !== undefined && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-700">{category.label}</span>
          <button
            type="button"
            onClick={onClearCategory}
            className="text-xs font-medium text-brand-red hover:underline focus:outline-none focus:ring-2 focus:ring-brand-red"
          >
            Ver todos los temas
          </button>
        </div>
      )}

      {articles.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          No encontramos nada con “{query}”. Prueba con otra palabra o escríbenos por
          WhatsApp desde la ficha del comercio.
        </p>
      ) : (
        <ul className="space-y-1">
          {articles.map((article) => (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => onOpenArticle(article)}
                className="flex w-full items-start gap-2 rounded-lg p-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                <ChevronRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="text-sm text-slate-800">{article.question}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FlowView({
  stepId,
  onChoose,
  onBack,
}: {
  stepId: string;
  onChoose: (option: SupportFlowOption) => void;
  onBack: () => void;
}) {
  const step = getFlowStep(SUPPORT_FLOW, stepId);

  if (step === undefined) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        No pudimos cargar el flujo de ayuda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-900">{step.question}</p>
      <ul className="space-y-1">
        {step.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onChoose(option)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:border-brand-red hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              {option.label}
              <Send className="h-4 w-4 shrink-0 text-brand-red" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        Volver al inicio
      </button>
    </div>
  );
}

function ArticleView({
  article,
  relatedArticles,
  onOpenArticle,
}: {
  article: SupportArticle;
  relatedArticles: readonly SupportArticle[];
  onOpenArticle: (article: SupportArticle) => void;
}) {
  const category = getCategoryById(SUPPORT_CATEGORIES, article.categoryId);

  return (
    <article className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {category?.label ?? article.categoryId}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">{article.question}</h3>
      </div>

      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {article.answer}
      </div>

      {relatedArticles.length > 0 && (
        <section className="rounded-lg bg-slate-50 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ver también
          </h4>
          <ul className="space-y-1">
            {relatedArticles.map((related) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onOpenArticle(related)}
                  className="flex w-full items-start gap-2 rounded-md p-1 text-left text-sm text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  {related.question}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}