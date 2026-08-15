import { useEffect, useRef, useState, type DragEvent } from 'react';
import { UploadCloud, X, Loader2, FileText, ImageIcon } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

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
      onFileSelect(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      onFileSelect(selected);
      return;
    }
    if (selected.size > MAX_BYTES) {
      onFileSelect(selected);
      return;
    }
    onFileSelect(selected);
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
      <label htmlFor="payment-proof-input" className="block text-sm font-medium text-gray-700 mb-1">
        Comprobante (foto o PDF):
      </label>

      <input
        ref={inputRef}
        id="payment-proof-input"
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        disabled={isProcessing}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          validateAndSelect(selected);
          event.target.value = '';
        }}
      />

      {file === null ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Zona para adjuntar comprobante de pago"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
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
            <span className="font-semibold text-brand-red">haz clic para seleccionar</span>
          </p>
          <p className="text-xs text-gray-400">JPG, PNG o PDF · máx. 5 MB</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa del comprobante"
                className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
              />
            ) : file.type === 'application/pdf' ? (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                <FileText className="h-8 w-8" aria-hidden="true" />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400">
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

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
