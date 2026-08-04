import { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'sage';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 select-none';

  const variantStyles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] disabled:bg-brand-300 shadow-soft',
    secondary: 'bg-white text-ink border border-neutral-300 hover:bg-cream-100 active:bg-cream-200',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 active:scale-[0.98] disabled:bg-danger-300',
    sage: 'bg-sage-500 text-white hover:bg-sage-600 active:scale-[0.98] disabled:bg-sage-300 shadow-soft',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {isLoading ? 'Cargando...' : children}
    </button>
  );
}