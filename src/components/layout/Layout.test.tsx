import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotificationToastProvider } from '../pwa/NotificationToast';

vi.mock('../../hooks/useStaffPermissions', () => ({
  useStaffPermissions: () => ({ permissions: null, isLoading: false }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, profile: { role: 'customer' }, isLoading: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual };
});

import { Layout } from './Layout';

function renderLayoutAt(path: string) {
  return render(
    <NotificationToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/marketplace" element={<div>Contenido mercado</div>} />
            <Route path="/login" element={<div>Pantalla login</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </NotificationToastProvider>,
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
