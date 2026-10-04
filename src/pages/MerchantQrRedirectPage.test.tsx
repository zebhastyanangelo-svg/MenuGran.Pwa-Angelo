import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { fromMock, maybeSingleMock, eqMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    categories: 'categories',
    products: 'products',
    orders: 'orders',
    deliveries: 'deliveries',
    userPushSubscriptions: 'user_push_subscriptions',
  },
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { MerchantQrRedirectPage } from './MerchantQrRedirectPage';

/**
 * Builder encadenable real: la consulta aplica tres `.eq()` seguidos, así que
 * `eq` debe devolver siempre el mismo objeto que también expone `maybeSingle`.
 */
function createQueryBuilder() {
  const builder = { eq: eqMock, maybeSingle: maybeSingleMock };
  eqMock.mockReturnValue(builder);
  return builder;
}

function renderRoute(token?: string) {
  return render(
    <MemoryRouter initialEntries={[`/q/${token ?? 'token-abc'}`]}>
      <Routes>
        <Route path="/q/:token" element={<MerchantQrRedirectPage />} />
        <Route path="/merchant/:merchantId" element={<div>Store loaded</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MerchantQrRedirectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = createQueryBuilder();
    fromMock.mockReturnValue({ select: vi.fn(() => builder) });
    maybeSingleMock.mockResolvedValue({ data: { id: 'merchant-1' }, error: null });
  });

  it('redirige a la tienda del comercio resuelto', async () => {
    renderRoute();

    expect(await screen.findByText('Store loaded')).toBeInTheDocument();
  });

  it('filtra por qr_token', async () => {
    renderRoute('token-abc');

    await screen.findByText('Store loaded');
    expect(fromMock).toHaveBeenCalledWith('merchants');
    expect(eqMock).toHaveBeenCalledWith('qr_token', 'token-abc');
  });

  it('sólo acepta comercios activos y aprobados', async () => {
    renderRoute();

    await screen.findByText('Store loaded');
    expect(eqMock).toHaveBeenCalledWith('is_active', true);
    expect(eqMock).toHaveBeenCalledWith('status', 'active');
  });

  it('muestra un mensaje de QR inválido si no hay comercio', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    renderRoute();

    expect(await screen.findByText(/Código QR no válido/i)).toBeInTheDocument();
    expect(screen.queryByText('Store loaded')).toBeNull();
  });

  it('enlaza al marketplace para seguir buscando', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    renderRoute();

    const link = await screen.findByRole('link', { name: /Ver comercios disponibles/i });
    expect(link).toHaveAttribute('href', '/marketplace');
  });

  it('trata el error de Supabase como QR inválido en vez de romperse', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    renderRoute();

    expect(await screen.findByText(/Código QR no válido/i)).toBeInTheDocument();
  });

  it('muestra estado de carga mientras valida', async () => {
    renderRoute();

    expect(screen.getByRole('status')).toHaveTextContent(/Validando|Abriendo/i);
    await waitFor(() => expect(screen.queryByText('Store loaded')).toBeInTheDocument());
  });
});