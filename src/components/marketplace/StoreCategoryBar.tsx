import { LayoutGrid } from 'lucide-react';
import type { MerchantCategory } from '../../types/database';
import { resolveCategoryIcon } from './categoryIcons';

export interface StoreCategoryOption {
  category: MerchantCategory;
  count: number;
}

export interface StoreCategoryBarProps {
  /** Categorías presentes en los comercios, con su cantidad. */
  options: StoreCategoryOption[];
  selectedCategory: MerchantCategory | null;
  onSelectCategory: (category: MerchantCategory | null) => void;
}

/**
 * Barra horizontal de categorías superiores del marketplace.
 *
 * Usa scroll horizontal nativo (`snap-x`) con las tarjetas ancladas para que el
 * desplazamiento con el dedo sea fluido, sin código de arrastre propio.
 */
export function StoreCategoryBar({
  options,
  selectedCategory,
  onSelectCategory,
}: StoreCategoryBarProps) {
  if (options.length === 0) return null;

  const hasSelection = selectedCategory !== null;

  const tabClass = (isSelected: boolean) =>
    [
      'flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
      isSelected
        ? 'bg-brand-red text-white shadow-sm'
        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    ].join(' ');

  return (
    <nav
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 pt-1"
      aria-label="Categorías de comercios"
    >
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        aria-pressed={!hasSelection}
        className={tabClass(!hasSelection)}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        Todas
      </button>

      {options.map(({ category, count }) => {
        const Icon = resolveCategoryIcon(category);
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(isSelected ? null : category)}
            aria-pressed={isSelected}
            className={tabClass(isSelected)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {category}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}