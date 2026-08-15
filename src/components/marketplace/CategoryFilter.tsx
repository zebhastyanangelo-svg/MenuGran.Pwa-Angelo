import type { CategoryRow } from '../../types/database';

export interface CategoryFilterProps {
  categories: CategoryRow[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  const baseClass =
    'whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/60';
  const activeClass = 'border-brand-red bg-brand-red text-white shadow-sm';
  const idleClass = 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

  return (
    <div className="no-scrollbar flex w-full gap-2 overflow-x-auto py-2" role="tablist" aria-label="Filtrar por categoría">
      <button
        type="button"
        role="tab"
        aria-selected={selectedCategoryId === null}
        onClick={() => onSelectCategory(null)}
        className={`${baseClass} ${selectedCategoryId === null ? activeClass : idleClass}`}
      >
        Todas
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            className={`${baseClass} ${isSelected ? activeClass : idleClass}`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
