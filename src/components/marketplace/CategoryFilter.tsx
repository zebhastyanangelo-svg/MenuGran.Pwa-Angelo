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
  return (
    <div className="no-scrollbar flex w-full gap-2 overflow-x-auto py-2">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
          selectedCategoryId === null
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Todas
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
