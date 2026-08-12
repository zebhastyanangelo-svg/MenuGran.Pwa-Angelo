import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renderiza la marca MenuGram', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('MenuGram')).toBeInTheDocument();
  });

  it('renderiza los enlaces de navegación', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /carrito/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /panel/i })).toBeInTheDocument();
  });
});
