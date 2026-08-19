import type { ChangeEvent } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

export interface ImageFieldState {
  url: string | null;
  uploading: boolean;
  error: string | null;
}

export interface ImageUploadFieldProps {
  label: string;
  fieldName: string;
  value: ImageFieldState;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function ImageUploadField({
  label,
  fieldName,
  value,
  onFileChange,
  onRemove,
}: ImageUploadFieldProps) {
  const inputId = `merchant-${fieldName}-input`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="flex items-center gap-4">
        {value.url ? (
          <div className="relative w-20 h-20 rounded-xl border overflow-hidden flex-shrink-0">
            <img
              src={value.url}
              alt={`Vista previa ${label.toLowerCase()}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={onRemove}
              disabled={value.uploading}
              className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl font-bold disabled:opacity-50"
              title={`Quitar ${label.toLowerCase()}`}
              aria-label={`Quitar ${label.toLowerCase()}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-1 flex-shrink-0">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        <div className="flex-grow">
          <label
            htmlFor={inputId}
            className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded text-xs font-medium cursor-pointer transition ${
              value.uploading
                ? 'bg-gray-200 text-gray-500 cursor-wait'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
            }`}
          >
            <Upload className="h-3 w-3" />
            {value.uploading ? 'Subiendo...' : 'Seleccionar foto'}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            aria-label={`Seleccionar foto de ${label.toLowerCase()}`}
            onChange={onFileChange}
            disabled={value.uploading}
            className="sr-only"
          />
          {value.error && (
            <p className="mt-1 text-xs text-red-600">{value.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
