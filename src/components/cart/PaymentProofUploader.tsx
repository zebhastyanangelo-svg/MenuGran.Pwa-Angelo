import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';


const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/**
 * `accept="image/*"` hace que Android/iOS abran la galería de fotos del
 * dispositivo (picker nativo de medios) en lugar del explorador de archivos
 * o Google Drive.
 */
const GALLERY_ACCEPT_ATTRIBUTE = 'image/*';
const TYPE_ERROR_MESSAGE =
  'Formato no permitido. Adjunta una foto (JPG, PNG o WebP).';

export interface PaymentProofUploaderProps {
  file: File | null;
  error: string | null;
  isProcessing: boolean;
  onFileSelect: (file: File | null) => void;
}

export function PaymentProofUploader({
  file,
  error,
  isProcessing,
  onFileSelect,
}: PaymentProofUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/') && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPreviewUrl(null);
  }, [file]);

  const validateAndSelect = (selected: File | null) => {
    if (selected === null) {
      setTypeError(null);
      onFileSelect(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setTypeError(TYPE_ERROR_MESSAGE);
      return;
    }
    setTypeError(null);
    onFileSelect(selected);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    validateAndSelect(selected);
    event.target.value = '';
  };

  const openGalleryPicker = () => {
    inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    validateAndSelect(dropped);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="payment-proof-input" data-testid="payment-proof-label" className="block text-sm font-medium text-gray-700 mb-1">
        Comprobante (solo imagen):
      </label>

      <input
        ref={inputRef}
        id="payment-proof-input"
        type="file"
        accept={GALLERY_ACCEPT_ATTRIBUTE}
        className="sr-only"
        disabled={isProcessing}
        onChange={handleInputChange}
      />

      {file === null ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zona para adjuntar comprobante de pago"
          onClick={openGalleryPicker}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openGalleryPicker();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? 'border-brand-red bg-red-50'
              : 'border-slate-200 bg-slate-50 hover:border-brand-red hover:bg-red-50'
          } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          <i className="fa-solid fa-cloud-arrow-up text-3xl text-brand-red" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Sube una foto clara de tu comprobante
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openGalleryPicker();
            }}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            <i className="fa-solid fa-image" aria-hidden="true" />
            Elegir de la galería
          </button>
          <p className="text-xs text-gray-400">JPG, PNG o WebP · máx. 5 MB</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-md bg-gray-100 max-w-full w-full max-h-48">
                <img
                  src={previewUrl}
                  alt="Vista previa del comprobante"
                  className="max-w-full w-full max-h-48 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400" aria-hidden="true">
                <i className="fa-solid fa-image text-3xl" aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
            </div>

            <button
              type="button"
              onClick={() => onFileSelect(null)}
              disabled={isProcessing}
              className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              aria-label="Quitar comprobante"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80">
              <i className="fa-solid fa-circle-notch animate-spin text-brand-red" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Subiendo comprobante…</span>
            </div>
          )}
        </div>
      )}

      {typeError && (
        <p className="mt-1 text-sm text-red-600" role="alert" data-testid="payment-proof-type-error">
          {typeError}
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
