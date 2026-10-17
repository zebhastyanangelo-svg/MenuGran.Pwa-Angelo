import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemModificationsAccordion } from './ItemModificationsAccordion';

function renderAccordion(overrides: Partial<Parameters<typeof ItemModificationsAccordion>[0]> = {}) {
  const onToggleIngredient = vi.fn();
  const onNotesChange = vi.fn();
  const props = {
    productId: 'p-1',
    productTitle: 'Pizza',
    ingredients: ['Queso', 'Cebolla', 'Jamón'],
    excludedIngredients: [],
    notes: '',
    onToggleIngredient,
    onNotesChange,
    ...overrides,
  };

  render(<ItemModificationsAccordion {...props} />);
  return { onToggleIngredient, onNotesChange };
}

describe('ItemModificationsAccordion', () => {
  it('arranca plegado y se abre con el botón de personalizar', async () => {
    const user = userEvent.setup();
    renderAccordion();

    const toggle = screen.getByRole('button', { name: /Personalizar Pizza/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('ingredient-picker-p-1')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('ingredient-picker-p-1')).toBeInTheDocument();
    expect(screen.getByLabelText(/Notas adicionales/i)).toBeInTheDocument();
  });

  it('no repite el título del platillo dentro del acordeón', async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(screen.getByRole('button', { name: /Personalizar Pizza/i }));

    const picker = screen.getByTestId('ingredient-picker-p-1');
    expect(picker).toHaveAccessibleName('Personaliza Pizza');
    expect(screen.queryByText('Personaliza Pizza')).not.toBeInTheDocument();
  });

  it('delega el tachado de ingredientes al carrito', async () => {
    const user = userEvent.setup();
    const { onToggleIngredient } = renderAccordion();

    await user.click(screen.getByRole('button', { name: /Personalizar Pizza/i }));
    await user.click(screen.getByRole('button', { name: 'Cebolla' }));

    expect(onToggleIngredient).toHaveBeenCalledWith('p-1', 'Cebolla');
  });

  it('delega el cambio de nota al carrito', async () => {
    const user = userEvent.setup();
    const { onNotesChange } = renderAccordion();

    await user.click(screen.getByRole('button', { name: /Personalizar Pizza/i }));
    fireEvent.change(screen.getByLabelText(/Notas adicionales/i), {
      target: { value: 'Sin salsa' },
    });

    expect(onNotesChange).toHaveBeenCalledWith('p-1', 'Sin salsa');
  });

  it('muestra el contador de modificaciones cuando ya hay alguna', async () => {
    const user = userEvent.setup();
    renderAccordion({ excludedIngredients: ['Cebolla'], notes: 'Sin salsa' });

    expect(screen.getByTestId('modifications-count-p-1')).toHaveTextContent('2');

    await user.click(screen.getByRole('button', { name: /Personalizar Pizza/i }));
    expect(screen.getByTestId('ingredient-picker-p-1')).toBeInTheDocument();
  });

  it('no muestra contador cuando el platillo está sin personalizar', () => {
    renderAccordion();

    expect(screen.queryByTestId('modifications-count-p-1')).not.toBeInTheDocument();
  });
});
