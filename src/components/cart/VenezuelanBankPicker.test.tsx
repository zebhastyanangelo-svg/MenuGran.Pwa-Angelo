import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { VenezuelanBankPicker } from './VenezuelanBankPicker';

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof VenezuelanBankPicker>> = {},
) {
  const onChange = vi.fn();
  render(
    <VenezuelanBankPicker
      id="payer-bank"
      label="Banco desde el que pagaste"
      value=""
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange };
}

function bankInput(): HTMLInputElement {
  return screen.getByRole('combobox', { name: /Banco desde el que pagaste/i });
}

describe('VenezuelanBankPicker', () => {
  it('empieza cerrado y con el valor ya guardado a la vista', () => {
    renderPicker({ value: 'Banesco' });

    expect(bankInput()).toHaveValue('Banesco');
    expect(bankInput()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filtra el catálogo por nombre al escribir', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), 'banesco');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Banesco');
    expect(options[0]).toHaveTextContent('0134');
  });

  it('filtra por el código de institución', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), '0191');

    expect(screen.getByRole('option')).toHaveTextContent('Banco Nacional de Crédito');
  });

  it('entrega el nombre canónico al elegir una sugerencia', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), 'mercantil');
    await user.click(screen.getByRole('option'));

    expect(onChange).toHaveBeenCalledWith('Mercantil');
    expect(bankInput()).toHaveValue('Mercantil');
    expect(bankInput()).toHaveAttribute('aria-expanded', 'false');
  });

  it('selecciona con el teclado sin usar el ratón', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), 'banplus');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('Banplus');
  });

  it('no da por elegido el primer banco al abrir y pulsar Enter', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    // Con el catálogo completo abierto la primera sugerencia es Banco de
    // Venezuela. Sin señal explícita del usuario, Enter no debe guardarla.
    await user.click(bankInput());
    await user.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(bankInput()).toHaveValue('');
  });

  it('tampoco elige solo por escribir el término', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), 'banesco');
    await user.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('sí elige tras señalar la sugerencia con la flecha', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(bankInput());
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('Banco de Venezuela');
  });

  it('avisa cuando la búsqueda no arroja resultados', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(bankInput());
    await user.type(bankInput(), 'zzzz');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(bankInput()).toHaveValue('zzzz');
  });

  it('mantiene elegible un banco escrito a mano antes del selector', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: 'Mi Coop' });

    await user.click(bankInput());
    await user.clear(bankInput());
    await user.type(bankInput(), 'coop');
    await user.click(screen.getByRole('option'));

    expect(onChange).toHaveBeenCalledWith('Mi Coop');
  });

  it('marca el campo como inválido cuando el commerce no ha elegido banco', () => {
    renderPicker({ invalid: true });

    expect(bankInput()).toHaveAttribute('aria-invalid', 'true');
  });
});