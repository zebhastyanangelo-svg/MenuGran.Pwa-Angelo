import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreCategoryBar } from './StoreCategoryBar';
import { resolveCategoryIcon } from './categoryIcons';
import type { MerchantCategory } from '../../types/database';

const OPTIONS = [
  { category: 'Restaurante' as MerchantCategory, count: 3 },
  { category: 'Bebidas' as MerchantCategory, count: 1 },
];

describe('resolveCategoryIcon', () => {
  it('devuelve un icono para cada categoría del dominio', () => {
    const categories: MerchantCategory[] = [
      'Comida rápida',
      'Restaurante',
      'Bebidas',
      'Postres',
      'Repostería',
      'Bodegón',
      'Otro',
    ];

    categories.forEach((category) => {
      expect(resolveCategoryIcon(category)).toBeDefined();
    });
  });
});

describe('StoreCategoryBar', () => {
  it('no renderiza nada cuando no hay categorías', () => {
    const { container } = render(
      <StoreCategoryBar
        options={[]}
        selectedCategory={null}
        onSelectCategory={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('muestra "Todas" y cada categoría con su contador', () => {
    render(
      <StoreCategoryBar
        options={OPTIONS}
        selectedCategory={null}
        onSelectCategory={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Todas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restaurante/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /Bebidas/ })).toHaveTextContent('1');
  });

  it('notifica la categoría seleccionada', async () => {
    const user = userEvent.setup();
    const onSelectCategory = vi.fn();
    render(
      <StoreCategoryBar
        options={OPTIONS}
        selectedCategory={null}
        onSelectCategory={onSelectCategory}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Restaurante/ }));
    expect(onSelectCategory).toHaveBeenCalledWith('Restaurante');

    await user.click(screen.getByRole('button', { name: /Todas/ }));
    expect(onSelectCategory).toHaveBeenLastCalledWith(null);
  });

  it('deselecciona al pulsar la categoría ya activa', async () => {
    const user = userEvent.setup();
    const onSelectCategory = vi.fn();
    render(
      <StoreCategoryBar
        options={OPTIONS}
        selectedCategory="Restaurante"
        onSelectCategory={onSelectCategory}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Restaurante/ }));
    expect(onSelectCategory).toHaveBeenCalledWith(null);
  });

  it('marca visualmente la categoría seleccionada', () => {
    render(
      <StoreCategoryBar
        options={OPTIONS}
        selectedCategory="Restaurante"
        onSelectCategory={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Restaurante/ })).toHaveClass(
      'bg-brand-red',
    );
    expect(screen.getByRole('button', { name: /Bebidas/ })).not.toHaveClass(
      'bg-brand-red',
    );
  });
});