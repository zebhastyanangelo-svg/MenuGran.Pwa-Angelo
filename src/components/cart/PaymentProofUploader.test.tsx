import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentProofUploader } from './PaymentProofUploader';

const EXPECTED_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function renderUploader(overrides: Partial<Parameters<typeof PaymentProofUploader>[0]> = {}) {
  const onFileSelect = vi.fn();
  render(
    <PaymentProofUploader
      file={null}
      error={null}
      isProcessing={false}
      onFileSelect={onFileSelect}
      {...overrides}
    />,
  );
  return { onFileSelect };
}

describe('PaymentProofUploader', () => {
  it('asigna accept explícito con los MIME soportados (JPEG, PNG, WebP, PDF)', () => {
    renderUploader();
    expect(screen.getByLabelText(/Comprobante \(foto o PDF\)/i)).toHaveAttribute(
      'accept',
      EXPECTED_ACCEPT,
    );
  });

  it('ofrece captura directa de cámara en móvil con capture="environment"', () => {
    renderUploader();
    const cameraInput = screen.getByLabelText(/Capturar comprobante con la cámara/i);
    expect(cameraInput).toHaveAttribute('capture', 'environment');
    expect(cameraInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('muestra el botón "Tomar foto" junto a la zona de arrastre', () => {
    renderUploader();
    expect(screen.getByRole('button', { name: /Tomar foto/i })).toBeInTheDocument();
  });

  it('pasa el archivo seleccionado al padre vía onFileSelect', async () => {
    const { onFileSelect } = renderUploader();
    const user = userEvent.setup();
    const file = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), file);
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('permite quitar el comprobante seleccionado', async () => {
    const file = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    const { onFileSelect } = renderUploader({ file });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Quitar comprobante/i }));
    expect(onFileSelect).toHaveBeenCalledWith(null);
  });
});
