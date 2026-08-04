// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input', () => {
  it('renderiza sin label', () => {
    render(<Input placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
  });

  it('renderiza label cuando se pasa', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('muestra mensaje de error', () => {
    render(<Input label="Email" error="Email inválido" />);
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });

  it('actualiza valor al cambiar y dispara onChange', () => {
    const onChange = vi.fn();
    const { container } = render(<Input label="Email" onChange={onChange} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a@b.com' } });
    expect(onChange).toHaveBeenCalled();
    expect(input.value).toBe('a@b.com');
  });

  it('está deshabilitado cuando disabled=true', () => {
    const { container } = render(<Input label="Email" disabled />);
    expect(container.querySelector('input')).toBeDisabled();
  });
});
