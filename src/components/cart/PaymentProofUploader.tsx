import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, X, Loader2, FileText, ImageIcon, Camera } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
/**
 * `accept="image/*"` hace que Android/iOS abran la galería de fotos del
 * dispositivo (picker nativo de medios) en lugar del explorador de archivos
 * o Google Drive. El PDF tiene su propio selector explícito: mezclarlo aquí
 * volvería a abrir el gestor de archivos genérico.
 */
const GALLERY_ACCEPT_ATTRIBUTE = 'image/*';
/** Solo imágenes: la cámara del dispositivo no genera PDF. */
const CAPTURE_ACCEPT_ATTRIBUTE = 'image/*';
const PDF_ACCEPT_ATTRIBUTE = 'application/pdf';
const TYPE_ERROR_MESSAGE =
  'Formato no permitido. Adjunta una foto (JPG, PNG, WebP) o un PDF.';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
        Comprobante (foto o PDF):
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

      <input
        ref={cameraInputRef}
        type="file"
        accept={CAPTURE_ACCEPT_ATTRIBUTE}
        capture="environment"
        aria-label="Capturar comprobante con la cámara"
        className="sr-only"
        disabled={isProcessing}
        onChange={handleInputChange}
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept={PDF_ACCEPT_ATTRIBUTE}
        aria-label="Seleccionar comprobante en PDF"
        className="sr-only"
        disabled={isProcessing}
        onChange={handleInputChange}
      />

      {file === null ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zona para adjuntar comprobante de pago"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
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
          <UploadCloud className="h-8 w-8 text-brand-red" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Arrastra tu comprobante aquí o{' '}
            <span className="font-semibold text-brand-red">elige una foto de tu galería</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                cameraInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-red hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Tomar foto
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                pdfInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-red hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Subir PDF
            </button>
          </div>
          <p className="text-xs text-gray-400">JPG, PNG, WebP o PDF · máx. 5 MB</p>
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
            ) : file.type === 'application/pdf' ? (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500" aria-hidden="true">
                <FileText className="h-8 w-8" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400" aria-hidden="true">
                <ImageIcon className="h-8 w-8" aria-hidden="true" />
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
              <X className="h-5 w-5" />
            </button>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80">
              <Loader2 className="h-5 w-5 animate-spin text-brand-red" aria-hidden="true" />
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
