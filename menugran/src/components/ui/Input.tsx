// components/ui/Input.tsx - Componente de input reutilizable

import { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  disabled?: boolean;
}

export default function Input({
  label,
  error,
  disabled,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-2 border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          error && 'border-danger-500 focus:ring-danger-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
    </div>
  );
}
