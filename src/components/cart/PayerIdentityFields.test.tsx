import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { PayerIdentityFields } from './PayerIdentityFields';

const PAYER = {
  bank: 'Banesco',
  phone: '0412-1234567',
  idNumber: 'V12345678',
};

function renderFields(
  overrides: Partial<React.ComponentProps<typeof PayerIdentityFields>> = {},
) {
  const handlers = {
    onBankChange: vi.fn(),
    onPhoneChange: vi.fn(),
    onIdNumberChange: vi.fn(),
  };
  render(<PayerIdentityFields payer={PAYER} {...handlers} {...overrides} />);
  return handlers;
}

describe('PayerIdentityFields', () => {
  it('etiqueta los tres datos de emisión sin usar "pagador"', () => {
    renderFields();

    expect(screen.getByLabelText('Banco emisor')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
    expect(screen.getByLabelText('Cédula / RIF')).toBeInTheDocument();
    expect(screen.queryByText(/pagador/i)).not.toBeInTheDocument();
  });

  it('muestra los valores recibidos', () => {
    renderFields();

    expect(screen.getByRole('combobox', { name: /Banco emisor/i })).toHaveValue('Banesco');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('0412-1234567');
    expect(screen.getByLabelText('Cédula / RIF')).toHaveValue('V12345678');
  });

  it('deja editar teléfono y cédula cuando vienen del perfil', async () => {
    const user = userEvent.setup();
    const { onPhoneChange, onIdNumberChange } = renderFields({
      readOnlyPhoneAndId: false,
    });

    await user.type(screen.getByLabelText('Teléfono'), 'X');
    await user.type(screen.getByLabelText('Cédula / RIF'), 'Y');

    expect(onPhoneChange).toHaveBeenCalledWith('0412-1234567X');
    expect(onIdNumberChange).toHaveBeenCalledWith('V12345678Y');
  });

  it('bloquea teléfono y cédula cuando vienen precargados del perfil', () => {
    renderFields({ readOnlyPhoneAndId: true });

    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Cédula / RIF')).toHaveAttribute('readonly');
  });

  it('reporta el banco canónico que elige el cliente', async () => {
    const user = userEvent.setup();
    const { onBankChange } = renderFields({ payer: { ...PAYER, bank: '' } });

    const bankField = screen.getByRole('combobox', { name: /Banco emisor/i });
    await user.click(bankField);
    await user.type(bankField, '0102');
    await user.click(screen.getByRole('option'));

    expect(onBankChange).toHaveBeenCalledWith('Banco de Venezuela');
  });

  it('acepta un prefijo de id para no repetir los campos en pantalla', () => {
    renderFields({ idPrefix: 'verification' });

    expect(screen.getByRole('combobox', { name: /Banco emisor/i })).toHaveAttribute(
      'id',
      'verification-bank',
    );
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('id', 'verification-phone');
  });
});