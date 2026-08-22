import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateMerchantForm } from './CreateMerchantForm';
import type { CreateMerchantAccountInput } from '../../utils/merchantRegistration';

const VALID_INPUT: CreateMerchantAccountInput = {
  ownerFullName: 'María Pérez',
  ownerCi: 'V-12345678',
  ownerPhone: '04141234567',
  ownerEmail: 'maria@pizzeria.com',
  businessName: 'La Pizzería de María',
  businessRif: 'J-40123456-7',
};

async function fillForm(input: CreateMerchantAccountInput): Promise<void> {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText('Nombre del propietario'),
    input.ownerFullName,
  );
  await user.type(screen.getByLabelText('C.I.'), input.ownerCi);
  await user.type(screen.getByLabelText('Teléfono'), input.ownerPhone);
  await user.type(
    screen.getByLabelText('Email (credenciales de acceso)'),
    input.ownerEmail,
  );
  await user.type(
    screen.getByLabelText('Nombre del negocio (público)'),
    input.businessName,
  );
  await user.type(screen.getByLabelText('RIF'), input.businessRif);
}

describe('CreateMerchantForm', () => {
  it('renderiza los seis campos requeridos', () => {
    render(<CreateMerchantForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('form', { name: /formulario de creación de negocio/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del propietario')).toBeInTheDocument();
    expect(screen.getByLabelText('C.I.')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Email (credenciales de acceso)'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Nombre del negocio (público)'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('RIF')).toBeInTheDocument();
  });

  it('envía el payload completo al enviar el formulario válido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateMerchantForm onSubmit={onSubmit} />);

    await fillForm(VALID_INPUT);
    await userEvent.click(
      screen.getByRole('button', { name: /crear negocio/i }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(VALID_INPUT);
  });

  it('muestra un error de validación y no envía cuando faltan campos', async () => {
    const onSubmit = vi.fn();
    render(<CreateMerchantForm onSubmit={onSubmit} />);

    await userEvent.click(
      screen.getByRole('button', { name: /crear negocio/i }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'El nombre del propietario es obligatorio.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error devuelto por el servicio y conserva los datos', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Error al crear la cuenta del propietario'));
    render(<CreateMerchantForm onSubmit={onSubmit} />);

    await fillForm(VALID_INPUT);
    await userEvent.click(
      screen.getByRole('button', { name: /crear negocio/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Error al crear la cuenta del propietario',
    );
    expect(screen.getByLabelText('Email (credenciales de acceso)')).toHaveValue(
      'maria@pizzeria.com',
    );
  });

  it('limpia el formulario tras una creación exitosa', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateMerchantForm onSubmit={onSubmit} />);

    await fillForm(VALID_INPUT);
    await userEvent.click(
      screen.getByRole('button', { name: /crear negocio/i }),
    );

    expect(screen.getByLabelText('Nombre del propietario')).toHaveValue('');
  });
});
