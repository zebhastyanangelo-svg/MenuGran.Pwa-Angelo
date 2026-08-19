import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MerchantSettingsPage } from './MerchantSettingsPage';
import type { MerchantRow, MerchantUpdate } from '../../types/database';

const authMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  supabaseMock: { from: vi.fn() },
  showToastMock: vi.fn(),
  uploadToImgBBMock: vi.fn(),
  saveSettingsMock: vi.fn(),
}));

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
  is_open: true,
  location: null,
  created_at: '2026-01-01T00:00:00.000Z',
  rif: 'J-12345678-0',
  category: 'Restaurante',
  description: 'Descripción',
  address: 'Calle 123',
  zone: 'Centro',
  phone_whatsapp: '+58 412-123-4567',
  service_modalities: ['Comer en el local'],
  business_hours: { days: 'L-V', open_time: '8:00', close_time: '20:00' },
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: authMocks.useAuthMock,
}));

vi.mock('../../hooks/useMerchantSettings', () => ({
  useMerchantSettings: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: authMocks.showToastMock,
    hideToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../services/imgbb', () => ({
  uploadToImgBB: authMocks.uploadToImgBBMock,
}));

async function getUseMerchantSettings() {
  const mod = await import('../../hooks/useMerchantSettings');
  return mod.useMerchantSettings as unknown as ReturnType<typeof vi.fn>;
}

describe('MerchantSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      profile: null,
      isLoading: false,
    });
    authMocks.uploadToImgBBMock.mockResolvedValue('https://i.ibb.co/sample/logo.jpg');
    authMocks.saveSettingsMock.mockResolvedValue(mockMerchant);
  });

  async function setMockState(
    overrides: {
      merchant?: MerchantRow | null;
      isLoading?: boolean;
      error?: string | null;
      saveSettings?: (updates: MerchantUpdate) => Promise<MerchantRow>;
    } = {},
  ) {
    const hook = await getUseMerchantSettings();
    hook.mockReturnValue({
      merchant: 'merchant' in overrides ? overrides.merchant : mockMerchant,
      isLoading: 'isLoading' in overrides ? overrides.isLoading : false,
      error: 'error' in overrides ? overrides.error : null,
      saveSettings: overrides.saveSettings ?? authMocks.saveSettingsMock,
      refetch: vi.fn(),
    });
  }

  it('muestra el estado de carga mientras se obtienen los datos', async () => {
    await setMockState({ isLoading: true, merchant: null });

    render(<MerchantSettingsPage />);

    expect(screen.getByText(/Cargando configuración/i)).toBeInTheDocument();
  });

  it('muestra el error si la carga falla', async () => {
    await setMockState({ isLoading: false, error: 'Fallo de red', merchant: null });

    render(<MerchantSettingsPage />);

    expect(
      screen.getByText(/Fallo de red/i),
    ).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay comercio', async () => {
    await setMockState({ isLoading: false, merchant: null });

    render(<MerchantSettingsPage />);

    expect(
      screen.getByText(/No se encontró el comercio/i),
    ).toBeInTheDocument();
  });

  it('renderiza los tres tabs con las etiquetas correctas', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    expect(
      screen.getByRole('button', { name: /Datos Generales/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ubicación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    ).toBeInTheDocument();
  });

  it('cambia de tab al hacer clic', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    expect(screen.getByText(/Nombre del Negocio/i)).toBeInTheDocument();

    await fireEvent.click(
      screen.getByRole('button', { name: /Ubicación/i }),
    );

    expect(screen.getByText(/Dirección/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nombre del Negocio/i)).not.toBeInTheDocument();

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    expect(screen.getAllByText('Logo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Banner').length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText(/Seleccionar foto de logo/i),
    ).toBeInTheDocument();
  });

   it('precarga los campos con los datos del comercio existente', async () => {
     await setMockState({ merchant: mockMerchant });

     render(<MerchantSettingsPage />);

     expect(screen.getByDisplayValue('Pizzería La Trattoria')).toBeInTheDocument();
     expect(screen.getByDisplayValue('J-12345678-0')).toBeInTheDocument();
     expect(
       screen.getByLabelText(/Categoría/i) as HTMLSelectElement,
     ).toHaveValue('Restaurante');

     await fireEvent.click(
       screen.getByRole('button', { name: /Ubicación/i }),
     );

     expect(screen.getByDisplayValue('Calle 123')).toBeInTheDocument();
     expect(screen.getByDisplayValue('Centro')).toBeInTheDocument();

     await fireEvent.click(
       screen.getByRole('button', { name: /Horarios e Identidad/i }),
     );

     expect(
       screen.getByRole('checkbox') as HTMLInputElement,
     ).toBeChecked();
   });

   it('muestra el enlace Vista Previa con href al store del comercio', async () => {
     await setMockState({ merchant: mockMerchant });

     render(<MerchantSettingsPage />);

     const previewLink = screen.getByRole('link', { name: /Vista Previa/i });
     expect(previewLink).toHaveAttribute('href', '/merchant/merchant-123');
     expect(previewLink).toHaveAttribute('target', '_blank');
     expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
   });

  it('envia los cambios al guardar y muestra toast de exito', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    fireEvent.change(screen.getByLabelText(/Nombre del Negocio/i), {
      target: { value: 'Pizzería Actualizada' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(authMocks.saveSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pizzería Actualizada',
          rif: 'J-12345678-0',
          category: 'Restaurante',
          address: 'Calle 123',
          zone: 'Centro',
          is_active: true,
          logo_url: null,
          banner_url: null,
        }),
      );
    });

    await waitFor(() => {
      expect(authMocks.showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Configuración guardada',
          variant: 'success',
        }),
      );
    });
  });

  it('muestra toast de error cuando saveSettings falla', async () => {
    await setMockState({
      saveSettings: vi.fn().mockRejectedValue(new Error('Error de guardado')),
    });

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(authMocks.showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error al guardar',
          variant: 'error',
        }),
      );
    });
  });

  it('sube el logo a ImgBB al seleccionar un archivo', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Seleccionar foto de logo/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(authMocks.uploadToImgBBMock).toHaveBeenCalledWith(file);
    });
  });

  it('limpia la imagen al hacer clic en el boton de quitar', async () => {
    const merchantWithLogo = {
      ...mockMerchant,
      logo_url: 'https://i.ibb.co/existing/logo.jpg',
    };
    await setMockState({ merchant: merchantWithLogo });

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    const preview = screen.getByAltText(/vista previa logo/i);
    expect(preview).toHaveAttribute('src', 'https://i.ibb.co/existing/logo.jpg');

    fireEvent.click(screen.getByTitle(/Quitar logo/i));

    expect(screen.queryByAltText(/vista previa logo/i)).not.toBeInTheDocument();
  });

  it('deshabilita el boton de guardar mientras se sube una imagen', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Seleccionar foto de logo/i);

    let resolveUpload: ((value: string) => void) | undefined;
    authMocks.uploadToImgBBMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Subiendo...')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeDisabled();

    resolveUpload!('https://i.ibb.co/uploaded/logo.jpg');
  });

  it('cambia el estado activo del checkbox', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('envia is_active en false cuando se desmarca', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    await screen.findByText('Guardar cambios');

    await fireEvent.click(
      screen.getByRole('button', { name: /Horarios e Identidad/i }),
    );

    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(authMocks.saveSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  it('muestra el nombre del comercio en el encabezado', async () => {
    await setMockState();

    render(<MerchantSettingsPage />);

    expect(screen.getByText(/Configuración del Comercio/i)).toBeInTheDocument();
  });
});
