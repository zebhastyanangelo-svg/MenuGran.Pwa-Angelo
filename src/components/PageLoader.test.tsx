import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('renders with default message', () => {
    render(<PageLoader />);

    expect(screen.getByText(/Cargando.../i)).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<PageLoader message="Cargando dashboard..." />);

    expect(screen.getByText(/Cargando dashboard.../i)).toBeInTheDocument();
  });

  it('renders the loading spinner element', () => {
    render(<PageLoader />);

    expect(screen.getByText(/Cargando.../i)).toBeInTheDocument();
  });
});
