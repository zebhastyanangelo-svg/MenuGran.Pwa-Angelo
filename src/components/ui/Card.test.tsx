import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

describe('Card', () => {
  it('renderiza el contenido principal', () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('aplica la clase base de tarjeta', () => {
    const { container } = render(<Card>Base</Card>);
    expect(container.firstChild).toHaveClass('rounded-2xl');
  });

  it('compone header, title y content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
        </CardHeader>
        <CardContent>Cuerpo</CardContent>
      </Card>,
    );
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo')).toBeInTheDocument();
  });

  it('aplica la clase de título semibold', () => {
    render(<CardTitle>Mi título</CardTitle>);
    expect(screen.getByText('Mi título')).toHaveClass('font-semibold');
  });
});
