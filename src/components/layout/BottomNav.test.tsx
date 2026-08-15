import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renderiza los enlaces de navegación', () => {
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /panel/i })).toBeInTheDocument();
  });

  it('marca como activo el enlace de la ruta actual', () => {
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveClass('text-brand-red');
  });

  it('usa el atributo de navegación principal', () => {
    render(
      <MemoryRouter initialEntries={['/marketplace']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
  });
});
