import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('aplica la animación pulse por defecto', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('aplica forma circular con la variante circular', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('aplica forma de texto con la variante text', () => {
    const { container } = render(<Skeleton variant="text" />);
    expect(container.firstChild).toHaveClass('h-4');
  });

  it('acepta clases personalizadas', () => {
    const { container } = render(<Skeleton className="w-40" />);
    expect(container.firstChild).toHaveClass('w-40');
  });
});
