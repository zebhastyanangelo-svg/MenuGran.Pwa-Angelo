// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('PublicLandingPage', () => {
  it('renderiza el nombre de la marca', async () => {
    const { default: PublicLandingPage } = await import('@/app/(public)/page');
    render(<PublicLandingPage />);
    expect(screen.getAllByText('MenuGran').length).toBeGreaterThan(0);
  });

  it('muestra botones de login y registro en el navbar', async () => {
    const { default: PublicLandingPage } = await import('@/app/(public)/page');
    render(<PublicLandingPage />);
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByText('Registrarme')).toBeInTheDocument();
  });

  it('incluye la sección "¿Cómo funciona?"', async () => {
    const { default: PublicLandingPage } = await import('@/app/(public)/page');
    render(<PublicLandingPage />);
    expect(screen.getByRole('heading', { name: /¿Cómo funciona\?/i })).toBeInTheDocument();
  });

  it('incluye la sección de restaurantes', async () => {
    const { default: PublicLandingPage } = await import('@/app/(public)/page');
    const { container } = render(<PublicLandingPage />);
    expect(container.querySelector('#restaurantes')).not.toBeNull();
  });
});
