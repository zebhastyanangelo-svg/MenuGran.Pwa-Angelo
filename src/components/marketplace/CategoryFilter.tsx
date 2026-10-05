import { LayoutGrid, type LucideIcon } from 'lucide-react';
import type { CategoryRow } from '../../types/database';
import { resolveCategoryIconByName } from './categoryIcons';

export interface CategoryFilterProps {
  categories: CategoryRow[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  /**
   * `tabs` dibuja pestañas con subrayado para la cabecera fija del local;
   * `chips` mantiene el aspecto de píldora redondeada.
   */
  variant?: 'chips' | 'tabs';
  /** Marca la barra como fija (`sticky`) respecto al contenedor con scroll. */
  sticky?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
  variant = 'chips',
  sticky = false,
}: CategoryFilterProps) {
  const containerClass = [
    'no-scrollbar -mx-4 flex w-full gap-2 overflow-x-auto px-4',
    sticky ? 'sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur' : 'py-1',
  ].join(' ');

  const baseClass =
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/60';

  const activeClass =
    variant === 'tabs'
      ? 'border-b-2 border-brand-red text-brand-red'
      : 'border border-brand-red bg-brand-red text-white shadow-sm';

  const idleClass =
    variant === 'tabs'
      ? 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

  const sizeClass = variant === 'tabs' ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-xs';

  const renderTab = (
    key: string,
    label: string,
    icon: LucideIcon,
    isSelected: boolean,
    onClick: () => void,
  ) => {
    const Icon = icon;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={isSelected}
        onClick={onClick}
        className={`${baseClass} ${sizeClass} ${
          isSelected ? activeClass : idleClass
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    );
  };

  return (
    <div
      className={containerClass}
      role="tablist"
      aria-label="Filtrar por categoría"
    >
      {renderTab(
        'all',
        'Todas',
        LayoutGrid,
        selectedCategoryId === null,
        () => onSelectCategory(null),
      )}

      {categories.map((cat) =>
        renderTab(
          cat.id,
          cat.name,
          resolveCategoryIconByName(cat.name),
          selectedCategoryId === cat.id,
          () => onSelectCategory(cat.id),
        ),
      )}
    </div>
  );
}