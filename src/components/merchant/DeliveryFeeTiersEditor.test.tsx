import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryFeeTiersEditor } from './DeliveryFeeTiersEditor';
import type { DeliveryFeeTierRow } from '../../types/database';

function makeTier(
  id: string,
  min_km: number,
  max_km: number,
  fee: number,
): DeliveryFeeTierRow {
  return {
    id,
    merchant_id: 'm-1',
    min_km,
    max_km,
    fee,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const onAdd = vi.fn().mockResolvedValue(undefined);
const onEdit = vi.fn().mockResolvedValue(undefined);
const onRemove = vi.fn().mockResolvedValue(undefined);

function renderEditor(tiers: DeliveryFeeTierRow[] = []) {
  return render(
    <DeliveryFeeTiersEditor
      tiers={tiers}
      loading={false}
      error={null}
      onAdd={onAdd}
      onEdit={onEdit}
      onRemove={onRemove}
    />,
  );
}

async function fillTierForm(
  user: ReturnType<typeof userEvent.setup>,
  min: string,
  max: string,
  fee: string,
) {
  await user.clear(screen.getByLabelText(/Desde \(km\)/i));
  await user.type(screen.getByLabelText(/Desde \(km\)/i), min);
  await user.clear(screen.getByLabelText(/Hasta \(km\)/i));
  await user.type(screen.getByLabelText(/Hasta \(km\)/i), max);
  await user.clear(screen.getByLabelText(/Tarifa \(\$\)/i));
  await user.type(screen.getByLabelText(/Tarifa \(\$\)/i), fee);
}

describe('DeliveryFeeTiersEditor', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    onAdd.mockResolvedValue(undefined);
    onEdit.mockResolvedValue(undefined);
    onRemove.mockResolvedValue(undefined);
    user = userEvent.setup();
  });

  it('muestra los tramos existentes formateados', () => {
    renderEditor([makeTier('t1', 0, 5, 2)]);

    expect(screen.getByText(/0\.00 - 5\.00 km → \$2\.00/)).toBeInTheDocument();
  });

  it('agrega un tramo válido llamando a onAdd', async () => {
    renderEditor();

    await fillTierForm(user, '0', '5', '2.50');
    await user.click(screen.getByRole('button', { name: /Agregar tramo/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ minKm: 0, maxKm: 5, fee: 2.5 });
    });
  });

  it('rechaza un rango donde el máximo no supera al mínimo', async () => {
    renderEditor();

    await fillTierForm(user, '5', '5', '2');
    await user.click(screen.getByRole('button', { name: /Agregar tramo/i }));

    expect(await screen.findByText(/El rango debe ser válido/i)).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('rechaza un tramo que se solapa con uno existente', async () => {
    renderEditor([makeTier('t1', 0, 5, 2)]);

    await fillTierForm(user, '3', '8', '3');
    await user.click(screen.getByRole('button', { name: /Agregar tramo/i }));

    expect(await screen.findByText(/se solapan/i)).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('elimina un tramo al pulsar Eliminar', async () => {
    renderEditor([makeTier('t1', 0, 5, 2)]);

    await user.click(screen.getByRole('button', { name: /Eliminar/i }));

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith('t1');
    });
  });

  it('edita un tramo existente sin chocar consigo mismo', async () => {
    renderEditor([makeTier('t1', 0, 5, 2)]);

    await user.click(screen.getByRole('button', { name: /Editar/i }));
    await fillTierForm(user, '0', '10', '4');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith('t1', { minKm: 0, maxKm: 10, fee: 4 });
    });
  });

  it('muestra el error del servicio cuando falla la carga', () => {
    render(
      <DeliveryFeeTiersEditor
        tiers={[]}
        loading={false}
        error="Error al cargar los tramos de tarifa."
        onAdd={onAdd}
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error al cargar los tramos de tarifa.',
    );
  });

  it('no dispara el submit del formulario contenedor al agregar un tramo', async () => {
    const outerSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={outerSubmit}>
        <DeliveryFeeTiersEditor
          tiers={[]}
          loading={false}
          error={null}
          onAdd={onAdd}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </form>,
    );

    await fillTierForm(user, '0', '5', '2.50');
    await user.click(screen.getByRole('button', { name: /Agregar tramo/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ minKm: 0, maxKm: 5, fee: 2.5 });
    });
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('agrega el tramo con Enter sin enviar el formulario contenedor', async () => {
    const outerSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={outerSubmit}>
        <DeliveryFeeTiersEditor
          tiers={[]}
          loading={false}
          error={null}
          onAdd={onAdd}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </form>,
    );

    await fillTierForm(user, '0', '5', '3');
    await user.type(screen.getByLabelText(/Tarifa \(\$\)/i), '{Enter}');

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ minKm: 0, maxKm: 5, fee: 3 });
    });
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('muestra estado de carga y evita el doble envío mientras guarda', async () => {
    let resolveAdd: () => void = () => {};
    onAdd.mockImplementation(
      () => new Promise<void>((resolve) => { resolveAdd = resolve; }),
    );
    renderEditor();

    await fillTierForm(user, '0', '5', '2');
    const submitButton = screen.getByRole('button', { name: /Agregar tramo/i });
    await user.click(submitButton);

    expect(await screen.findByRole('button', { name: /Guardando\.\.\./i })).toBeDisabled();

    // Un segundo clic mientras guarda no debe insertar dos veces.
    await user.click(screen.getByRole('button', { name: /Guardando\.\.\./i }));
    resolveAdd();

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('button', { name: /Agregar tramo/i })).toBeInTheDocument();
  });

  it('muestra el error y mantiene el formulario cuando onAdd falla', async () => {
    onAdd.mockRejectedValue(new Error('Error de red'));
    renderEditor();

    await fillTierForm(user, '0', '5', '2');
    await user.click(screen.getByRole('button', { name: /Agregar tramo/i }));

    expect(await screen.findByText(/Error de red/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Desde \(km\)/i)).toHaveValue(0);
  });
});
