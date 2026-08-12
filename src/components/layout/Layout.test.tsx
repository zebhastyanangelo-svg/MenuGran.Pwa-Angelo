import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';

function renderLayoutAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/marketplace" element={<div>Contenido mercado</div>} />
          <Route path="/login" element={<div>Pantalla login</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('renderiza el contenido del Outlet', () => {
    renderLayoutAt('/marketplace');
    expect(screen.getByText('Contenido mercado')).toBeInTheDocument();
  });

  it('muestra la navegación en rutas de contenido', () => {
    renderLayoutAt('/marketplace');
    expect(screen.getAllByRole('navigation', { name: /navegación principal/i })).toHaveLength(2);
  });

  it('oculta la navegación en rutas de autenticación', () => {
    renderLayoutAt('/login');
    expect(screen.queryAllByRole('navigation', { name: /navegación principal/i })).toHaveLength(0);
  });
});
