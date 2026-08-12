import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  helperText?: string;
}

const baseInput =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, leftIcon, helperText, className = '', id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(error);

  const stateClasses = hasError
    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
    : 'border-gray-300 focus:ring-brand-500 focus:border-brand-500';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseInput} ${stateClasses} ${leftIcon ? 'pl-10' : ''} ${className}`}
          aria-invalid={hasError}
          {...rest}
        />
      </div>
      {hasError ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
});
