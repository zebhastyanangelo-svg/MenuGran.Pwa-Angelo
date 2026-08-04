// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renderiza un contenedor con un spinner animado', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
    expect(spinner?.className).toContain('rounded-full');
  });

  it('centra el contenido verticalmente', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('justify-center');
  });
});
