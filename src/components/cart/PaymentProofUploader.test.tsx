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
    expect(screen.getByLabelText(/Comprobante \(solo imagen\)/i)).toHaveAttribute(
      'accept',
      'image/*',
    );
  });

  it('ofrece el botón principal "Elegir de la galería"', () => {
    renderUploader();
    expect(screen.getByRole('button', { name: /Elegir de la galería/i })).toBeInTheDocument();
  });

  it('muestra el título simplificado y el texto guía de la zona de carga', () => {
    renderUploader();
    expect(screen.getByTestId('payment-proof-label')).toHaveTextContent('Comprobante (solo imagen)');
    expect(screen.getByText('Sube una foto clara de tu comprobante')).toBeInTheDocument();
    expect(screen.getByText('JPG, PNG o WebP · máx. 5 MB')).toBeInTheDocument();
  });

  it('no ofrece opciones de cámara ni de PDF', () => {
    renderUploader();
    expect(screen.queryByRole('button', { name: /Tomar foto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Capturar comprobante con la cámara/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Seleccionar comprobante en PDF/i)).not.toBeInTheDocument();
  });

  it('pasa el archivo seleccionado al padre vía onFileSelect', async () => {
    const { onFileSelect } = renderUploader();
    const user = userEvent.setup();
    const file = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(solo imagen\)/i), file);
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

  it('rechaza un PDF: solo se admiten imágenes', () => {
    const { onFileSelect } = renderUploader();
    const dropZone = screen.getByRole('button', { name: /Zona para adjuntar comprobante/i });
    const pdf = new File(['%PDF-1.4'], 'comprobante.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [pdf] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('payment-proof-type-error')).toHaveTextContent(/Formato no permitido/i);
  });

  it('limpia el error de formato cuando se elige un archivo válido', async () => {
    const { onFileSelect } = renderUploader();
    const dropZone = screen.getByRole('button', { name: /Zona para adjuntar comprobante/i });
    const video = new File(['video'], 'comprobante.mp4', { type: 'video/mp4' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [video] } });
    expect(await screen.findByTestId('payment-proof-type-error')).toBeInTheDocument();

    const user = userEvent.setup();
    const photo = new File(['proof'], 'comprobante.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Comprobante \(solo imagen\)/i), photo);

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
