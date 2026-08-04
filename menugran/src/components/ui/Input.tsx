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
        <label className="block text-sm font-medium text-ink-light mb-1">
          {label}
        </label>
      )}
      <input
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-ink placeholder:text-neutral-400 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
          error && 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
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