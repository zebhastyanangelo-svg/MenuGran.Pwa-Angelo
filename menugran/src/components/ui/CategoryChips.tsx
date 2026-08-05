'use client';

import { useState } from 'react';
import { Pizza, Beef, Fish, Salad, Coffee, IceCream } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Category {
  label: string;
  icon: LucideIcon;
}

const CATEGORIES: Category[] = [
  { label: 'Pizza', icon: Pizza },
  { label: 'Hamburguesas', icon: Beef },
  { label: 'Sushi', icon: Fish },
  { label: 'Saludable', icon: Salad },
  { label: 'Café', icon: Coffee },
  { label: 'Postres', icon: IceCream },
];

interface CategoryChipsProps {
  onFilterChange?: (category: string | null) => void;
}

export default function CategoryChips({ onFilterChange }: CategoryChipsProps) {
  const [active, setActive] = useState<string | null>(null);

  const toggle = (label: string | null) => {
    const next = active === label ? null : label;
    setActive(next);
    onFilterChange?.(next);
  };

  return (
    <div
      className="chip-scroll flex gap-2 overflow-x-auto py-2"
      role="tablist"
      aria-label="Filtrar por categoría"
    >
      <button
        type="button"
        onClick={() => toggle(null)}
        className={active === null ? 'filter-chip-active' : 'filter-chip'}
        role="tab"
        aria-selected={active === null}
      >
        Todas
      </button>
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = active === cat.label;
        return (
          <button
            key={cat.label}
            type="button"
            onClick={() => toggle(cat.label)}
            className={isActive ? 'filter-chip-active' : 'filter-chip'}
            role="tab"
            aria-selected={isActive}
          >
            <Icon className="h-4 w-4" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
