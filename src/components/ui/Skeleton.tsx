import type { HTMLAttributes } from 'react';

type SkeletonVariant = 'text' | 'rectangular' | 'circular';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  rectangular: 'rounded-lg',
  circular: 'rounded-full',
};

export function Skeleton({ variant = 'rectangular', className = '', ...rest }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
      {...rest}
    />
  );
}
