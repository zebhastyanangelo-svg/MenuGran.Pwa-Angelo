import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingModal } from './OnboardingModal';

describe('OnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el paso 1 con su título y descripción', () => {
    render(<OnboardingModal onFinish={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Explora los comercios cercanos/i })).toBeInTheDocument();
    expect(screen.getByText(/Navega por el catálogo de MenuGran/i)).toBeInTheDocument();
  });

  it('avanza al paso 2 y al paso 3 con el botón Siguiente', () => {
    render(<OnboardingModal onFinish={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Arma tu pedido/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Adjunta tu Pago Móvil y Rastrea/i })).toBeInTheDocument();
  });

  it('vuelve al paso anterior con el botón Anterior', () => {
    render(<OnboardingModal onFinish={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));

    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anterior/i })).not.toBeInTheDocument();
  });

  it('muestra el botón Saltar en cualquier paso', () => {
    render(<OnboardingModal onFinish={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Saltar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByRole('button', { name: /Saltar/i })).toBeInTheDocument();
  });

  it('invoca onFinish al hacer clic en Saltar', () => {
    const onFinish = vi.fn();
    render(<OnboardingModal onFinish={onFinish} />);

    fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('muestra "Entendido, ¡Comenzar a pedir!" solo en el último paso e invoca onFinish', () => {
    const onFinish = vi.fn();
    render(<OnboardingModal onFinish={onFinish} />);

    expect(screen.queryByRole('button', { name: /Entendido/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    fireEvent.click(screen.getByRole('button', { name: /Entendido, ¡Comenzar a pedir!/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
