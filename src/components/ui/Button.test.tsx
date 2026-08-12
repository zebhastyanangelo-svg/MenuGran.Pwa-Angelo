import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza el contenido hijo', () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('llama onClick al pulsar', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Pulsar</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica la clase de variante danger', () => {
    render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('se deshabilita cuando isLoading', () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Cargando
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('no dispara onClick estando deshabilitado', () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Cargando
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respeta la prop disabled', () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
