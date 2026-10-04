import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MerchantRow } from '../../types/database';
import { MerchantQrPanel } from './MerchantQrPanel';

function buildMerchant(overrides: Partial<MerchantRow> = {}): MerchantRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    owner_id: 'owner-1',
    name: 'Sabor Criollo',
    slug: 'sabor-criollo',
    logo_url: null,
    banner_url: null,
    status: 'active',
    verification_docs: {},
    is_active: true,
    is_open: true,
    location: null,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: 'J-123',
    category: 'Restaurante',
    description: null,
    address: 'Calle 1',
    zone: null,
    phone_whatsapp: '04120000000',
    service_modalities: [],
    business_hours: { days: '', open_time: '', close_time: '' },
    qr_token: 'token-abc',
    ...overrides,
  };
}

/**
 * Generar el PNG de 512px puede tardar más de 1s en jsdom, así que se espera
 * con margen en lugar del timeout por defecto de `findByRole`.
 */
const QR_TIMEOUT = 15000;

function findQrImage() {
  return screen.findByRole('img', { name: /Código QR/i }, { timeout: QR_TIMEOUT });
}

describe('MerchantQrPanel', () => {
  let persist: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    persist = vi.fn().mockResolvedValue(undefined);
  });

  it('muestra la vista previa del QR a partir del token existente', async () => {
    render(<MerchantQrPanel merchant={buildMerchant()} onPersistToken={persist} />);

    const image = await findQrImage();
    expect(image.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });

  it('muestra la URL pública que se codifica', async () => {
    render(<MerchantQrPanel merchant={buildMerchant()} onPersistToken={persist} />);

    await findQrImage();
    expect(screen.getByText(new RegExp(`/q/token-abc$`))).toBeInTheDocument();
  });

  it('no persiste nada si el comercio ya tiene token', async () => {
    render(<MerchantQrPanel merchant={buildMerchant()} onPersistToken={persist} />);

    await findQrImage();
    expect(persist).not.toHaveBeenCalled();
  });

  it('genera y persiste un token si el comercio no tiene', async () => {
    const merchant = buildMerchant({ qr_token: null });
    render(<MerchantQrPanel merchant={merchant} onPersistToken={persist} />);

    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(persist.mock.calls[0][0]).toEqual(expect.any(String));
  });

  it('regenera el token bajo demanda', async () => {
    const user = userEvent.setup();
    render(<MerchantQrPanel merchant={buildMerchant()} onPersistToken={persist} />);

    await findQrImage();
    await user.click(screen.getByRole('button', { name: /Regenerar/i }));

    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(persist.mock.calls[0][0]).not.toBe('token-abc');
  });

  it('avisa cuando falla la persistencia del token', async () => {
    const user = userEvent.setup();
    persist.mockRejectedValue(new Error('sin permisos'));
    render(<MerchantQrPanel merchant={buildMerchant()} onPersistToken={persist} />);

    await findQrImage();
    await user.click(screen.getByRole('button', { name: /Regenerar/i }));

    expect(await screen.findByText(/No se pudo regenerar/i)).toBeInTheDocument();
  });

  it('deshabilita la descarga hasta que el QR está listo', async () => {
    render(<MerchantQrPanel merchant={buildMerchant({ qr_token: null })} onPersistToken={persist} />);

    expect(screen.getByRole('button', { name: /Descargar PNG/i })).toBeDisabled();

    // Se espera la generación para que el update de estado no escape del test.
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  });
});