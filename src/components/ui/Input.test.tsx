import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('asocia la etiqueta al campo', () => {
    render(<Input label="Correo" />);
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('muestra el mensaje de error con rol alert', () => {
    render(<Input label="Correo" error="Campo requerido" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo requerido');
  });

  it('muestra el texto de ayuda cuando no hay error', () => {
    render(<Input label="Correo" helperText="Usa tu email" />);
    expect(screen.getByText('Usa tu email')).toBeInTheDocument();
  });

  it('refleja la escritura en el valor del input', () => {
    render(<Input onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    expect(input).toHaveValue('hola');
  });

  it('marca el campo inválido cuando hay error', () => {
    render(<Input label="Correo" error="Requerido" />);
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
  });
});
