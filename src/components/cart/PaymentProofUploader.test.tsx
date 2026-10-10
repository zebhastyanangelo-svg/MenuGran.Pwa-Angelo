import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentProofUploader } from './PaymentProofUploader';

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
  it('usa accept="image/*" para abrir la galería nativa del dispositivo', () => {
    renderUploader();
    // En Android/iOS, "image/*" abre el selector de fotos/galería nativo en
    // lugar del gestor de archivos (Google Drive).
    expect(screen.getByLabelText(/Comprobante \(foto o PDF\)/i)).toHaveAttribute(
      'accept',
      'image/*',
    );
  });

  it('ofrece captura directa de cámara en móvil con capture="environment"', () => {
    renderUploader();
    const cameraInput = screen.getByLabelText(/Capturar comprobante con la cámara/i);
    expect(cameraInput).toHaveAttribute('capture', 'environment');
    expect(cameraInput).toHaveAttribute('accept', 'image/*');
  });

  it('ofrece un selector exclusivo de PDF con accept="application/pdf"', () => {
    renderUploader();
    const pdfInput = screen.getByLabelText(/Seleccionar comprobante en PDF/i);
    expect(pdfInput).toHaveAttribute('accept', 'application/pdf');
    expect(screen.getByRole('button', { name: /Subir PDF/i })).toBeInTheDocument();
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

  it('rechaza formatos no soportados con un error visible y sin seleccionarlos', async () => {
    const { onFileSelect } = renderUploader();
    // El arrastre no filtra por accept: es la vía realista para un archivo
    // con formato no soportado (p. ej. un video de la galería).
    const dropZone = screen.getByRole('button', { name: /Zona para adjuntar comprobante/i });
    const video = new File(['video'], 'comprobante.mp4', { type: 'video/mp4' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [video] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    const typeError = await screen.findByTestId('payment-proof-type-error');
    expect(typeError).toHaveTextContent(/Formato no permitido/i);
  });

  it('acepta un PDF cargado desde el selector exclusivo', async () => {
    const { onFileSelect } = renderUploader();
    const user = userEvent.setup();
    const pdf = new File(['%PDF-1.4'], 'comprobante.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/Seleccionar comprobante en PDF/i), pdf);
    expect(onFileSelect).toHaveBeenCalledWith(pdf);
  });

  it('limpia el error de formato cuando se elige un archivo válido', async () => {
    const { onFileSelect } = renderUploader();
    const dropZone = screen.getByRole('button', { name: /Zona para adjuntar comprobante/i });
    const video = new File(['video'], 'comprobante.mp4', { type: 'video/mp4' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [video] } });
    expect(await screen.findByTestId('payment-proof-type-error')).toBeInTheDocument();

    const user = userEvent.setup();
    const photo = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(foto o PDF\)/i), photo);

    expect(onFileSelect).toHaveBeenCalledWith(photo);
    expect(screen.queryByTestId('payment-proof-type-error')).not.toBeInTheDocument();
  });

  it('permite quitar el comprobante seleccionado', async () => {
    const file = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    const { onFileSelect } = renderUploader({ file });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Quitar comprobante/i }));
    expect(onFileSelect).toHaveBeenCalledWith(null);
  });
});
