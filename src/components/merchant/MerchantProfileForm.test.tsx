import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MerchantProfileForm } from './MerchantProfileForm';
import type { MerchantRow } from '../../types/database';

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  TABLE_NAMES: {
    merchants: 'merchants',
  },
}));

vi.mock('../../services/imgbb', () => ({
  uploadToImgBB: vi.fn().mockResolvedValue('https://i.ibb.co/sample/logo.jpg'),
}));

// Import after mocks so the mocked modules are applied.
import { supabase } from '../../services/supabase';
import { uploadToImgBB } from '../../services/imgbb';

const mockMerchant: MerchantRow = {
  id: 'merchant-123',
  owner_id: 'user-1',
  name: 'Pizzería La Trattoria',
  slug: 'pizzeria-la-trattoria',
  logo_url: null,
  banner_url: null,
  status: 'active' as const,
  verification_docs: {} as Record<string, unknown>,
  is_active: true,
  location: null,
  created_at: new Date().toISOString(),
  rif: 'J-12345678-0',
  category: 'Restaurante',
  description: 'Descripción',
  address: 'Dirección',
  zone: null,
  phone_whatsapp: '+58 412-123-4567',
  service_modalities: ['Comer en el local'],
  business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
};

describe('MerchantProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (uploadToImgBB as ReturnType<typeof vi.fn>).mockResolvedValue(
      'https://i.ibb.co/sample/logo.jpg',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSupabase({
    merchant = mockMerchant,
    updateError = null,
    updateData = null,
  }: {
    merchant?: typeof mockMerchant | null;
    updateError?: Error | null;
    updateData?: unknown;
  } = {}) {
    const fetchSingle = vi.fn().mockResolvedValue({
      data: merchant,
      error: merchant ? null : new Error('Not found'),
    });

    const updateSingle = vi.fn().mockResolvedValue({
      data: updateData,
      error: updateError,
    });

    const updateResult = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: updateSingle,
    };

    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnValue(updateResult),
      single: fetchSingle,
    };

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      () => builder,
    );
  }

  it('muestra el estado de carga y luego renderiza el formulario', async () => {
    mockSupabase();

    render(<MerchantProfileForm merchantId="merchant-123" />);

    expect(screen.getByText(/Cargando perfil/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });
  });

  it('precarga el nombre, logo y banner del comercio existente', async () => {
    mockSupabase({
      merchant: {
        ...mockMerchant,
        logo_url: 'https://i.ibb.co/existing/logo.jpg',
        banner_url: 'https://i.ibb.co/existing/banner.jpg',
      },
    });

    render(<MerchantProfileForm merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pizzería La Trattoria')).toBeInTheDocument();
    });

    const previews = screen.getAllByAltText(/vista previa/i);
    expect(previews[0]).toHaveAttribute('src', 'https://i.ibb.co/existing/logo.jpg');
  });

  it('sube el logo a ImgBB al seleccionar un archivo', async () => {
    mockSupabase();

    render(<MerchantProfileForm merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Seleccionar foto de logo/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadToImgBB).toHaveBeenCalledWith(file);
    });

    const preview = await screen.findByAltText(/vista previa logo/i);
    expect(preview).toHaveAttribute('src', 'https://i.ibb.co/sample/logo.jpg');
  });

  it('envia name, logo_url y banner_url al guardar', async () => {
    mockSupabase();

    render(<MerchantProfileForm merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Nombre del Negocio/i), {
      target: { value: 'Pizzería Actualizada' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByText(/Perfil actualizado correctamente/i)).toBeInTheDocument();
    });

    const fromCall = (supabase.from as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fromCall[0]).toBe('merchants');

    const builder = (supabase.from as ReturnType<typeof vi.fn>).mock
      .results[0].value;
    expect(builder.update).toHaveBeenCalledWith({
      name: 'Pizzería Actualizada',
      logo_url: null,
      banner_url: null,
    });
    expect(builder.update.mock.results[0].value.eq).toHaveBeenCalled();
  }, 10000);

  it('muestra el error de la API si la subida a ImgBB falla', async () => {
    mockSupabase();
    (uploadToImgBB as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('La API key de ImgBB no está configurada.'),
    );

    render(<MerchantProfileForm merchantId="merchant-123" />);

    await waitFor(() => {
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Seleccionar foto de logo/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/La API key de ImgBB no está configurada./i),
      ).toBeInTheDocument();
    });
  });
});
