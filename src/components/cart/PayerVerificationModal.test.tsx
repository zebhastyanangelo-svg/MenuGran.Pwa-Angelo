import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { PayerVerificationModal } from './PayerVerificationModal';

const COMPLETE_PAYER = {
  bank: 'Banesco',
  phone: '0412-1234567',
  idNumber: 'V12345678',
};

function renderModal(payer = COMPLETE_PAYER) {
  const onChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <PayerVerificationModal
      isOpen
      payer={payer}
      onChange={onChange}
      onConfirm={onConfirm}
      isProcessing={false}
    />,
  );
  return { onChange, onConfirm };
}

describe('PayerVerificationModal', () => {
  it('pide verificar los datos de emisión del pago', () => {
    renderModal();

    expect(
      screen.getByRole('dialog', { name: /verifica tus datos de emisión de pago/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/usa estos datos para encontrar tu transferencia/i)).toBeInTheDocument();
  });

  it('muestra banco emisor, teléfono y cédula con los datos actuales', () => {
    renderModal();

    expect(screen.getByRole('combobox', { name: /Banco emisor/i })).toHaveValue('Banesco');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('0412-1234567');
    expect(screen.getByLabelText('Cédula / RIF')).toHaveValue('V12345678');
  });

  it('evita la palabra "pagador" en las etiquetas', () => {
    renderModal();

    expect(screen.queryByText(/pagador/i)).not.toBeInTheDocument();
  });

  it('deja corregir los tres datos antes de confirmar', async () => {
    const user = userEvent.setup();
    const { onChange } = renderModal();

    const bankField = screen.getByRole('combobox', { name: /Banco emisor/i });
    await user.clear(bankField);
    await user.click(bankField);
    await user.type(bankField, 'mercantil');
    await user.click(screen.getByRole('option'));
    expect(onChange).toHaveBeenCalledWith({ bank: 'Mercantil' });

    await user.type(screen.getByLabelText('Teléfono'), 'X');
    expect(onChange).toHaveBeenCalledWith({ phone: '0412-1234567X' });
  });

  it('confirma y habilita el envío definitivo', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByTestId('confirm-payer-verification'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('bloquea la confirmación mientras falte el banco emisor', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal({ ...COMPLETE_PAYER, bank: '' });

    await user.click(screen.getByTestId('confirm-payer-verification'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('payer-verification-error')).toHaveTextContent(
      /Selecciona el banco/i,
    );
  });

  it('bloquea la confirmación mientras falte teléfono o cédula', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal({ ...COMPLETE_PAYER, phone: '' });

    await user.click(screen.getByTestId('confirm-payer-verification'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('payer-verification-error')).toHaveTextContent(/teléfono/i);
  });

  it('no se puede saltar sin confirmar los datos', () => {
    renderModal();

    // Modal obligatorio: sin botón de cerrar ni cierre por fondo.
    expect(screen.queryByRole('button', { name: /Cerrar/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-payer-verification')).toBeEnabled();
  });
});