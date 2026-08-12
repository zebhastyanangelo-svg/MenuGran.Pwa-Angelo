import type { HTMLAttributes, ReactNode } from 'react';

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = '', children, ...rest }: CardSectionProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardSectionProps) {
  return (
    <div className={`border-b border-gray-100 px-4 py-3 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...rest }: CardSectionProps) {
  return (
    <h3 className={`text-base font-semibold text-gray-900 ${className}`} {...rest}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...rest }: CardSectionProps) {
  return (
    <div className={`px-4 py-3 ${className}`} {...rest}>
      {children}
    </div>
  );
}
