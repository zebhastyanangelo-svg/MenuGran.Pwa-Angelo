import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza el contenido', () => {
    render(<Badge>Nuevo</Badge>);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('aplica la clase de variante success', () => {
    render(<Badge variant="success">Listo</Badge>);
    expect(screen.getByText('Listo')).toHaveClass('bg-green-100');
  });

  it('usa la variante neutral por defecto', () => {
    render(<Badge>Neutral</Badge>);
    expect(screen.getByText('Neutral')).toHaveClass('bg-gray-100');
  });

  it('aplica clases personalizadas', () => {
    render(<Badge className="text-lg">Extra</Badge>);
    expect(screen.getByText('Extra')).toHaveClass('text-lg');
  });
});
