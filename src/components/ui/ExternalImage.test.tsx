import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExternalImage } from './ExternalImage';

describe('ExternalImage', () => {
  it('renderiza la imagen con la URL normalizada a HTTPS', () => {
    render(
      <ExternalImage
        src="http://i.ibb.co/abc/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    const img = screen.getByAltText('Plato');
    expect(img).toHaveAttribute('src', 'https://i.ibb.co/abc/plato.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('muestra el respaldo cuando la URL es nula o vacía', () => {
    const { rerender } = render(
      <ExternalImage src={null} alt="Plato" fallback={<span>Sin foto</span>} />,
    );

    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.queryByAltText('Plato')).not.toBeInTheDocument();

    rerender(
      <ExternalImage src="   " alt="Plato" fallback={<span>Sin foto</span>} />,
    );
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
  });

  it('muestra el respaldo cuando la imagen falla al cargar (onError)', () => {
    render(
      <ExternalImage
        src="https://i.ibb.co/roto/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    const img = screen.getByAltText('Plato');
    fireEvent.error(img);

    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.queryByAltText('Plato')).not.toBeInTheDocument();
  });

  it('se recupera cuando la URL cambia después de un error', () => {
    const { rerender } = render(
      <ExternalImage
        src="https://i.ibb.co/roto/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    fireEvent.error(screen.getByAltText('Plato'));
    expect(screen.getByText('Sin foto')).toBeInTheDocument();

    rerender(
      <ExternalImage
        src="https://i.ibb.co/nuevo/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    expect(screen.getByAltText('Plato')).toHaveAttribute(
      'src',
      'https://i.ibb.co/nuevo/plato.jpg',
    );
    expect(screen.queryByText('Sin foto')).not.toBeInTheDocument();
  });
});
