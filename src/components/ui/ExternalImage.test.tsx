import { describe, expect, it, vi } from 'vitest';
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

  it('registra en consola la URL exacta que falla (depuración en móvil)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ExternalImage
        src="https://i.ibb.co/roto/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    fireEvent.error(screen.getByAltText('Plato'));

    expect(consoleError).toHaveBeenCalledWith(
      '[ExternalImage] Error al cargar imagen externa',
      expect.objectContaining({
        url: 'https://i.ibb.co/roto/plato.jpg',
        alt: 'Plato',
      }),
    );

    consoleError.mockRestore();
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

  it('versiona la URL para invalidar la caché obsoleta del navegador', () => {
    render(
      <ExternalImage
        src="https://i.ibb.co/abc/plato.jpg"
        alt="Plato"
        version="2026-10-20T20:20:20.000Z"
        fallback={<span>Sin foto</span>}
      />,
    );

    expect(screen.getByAltText('Plato')).toHaveAttribute(
      'src',
      `https://i.ibb.co/abc/plato.jpg?v=${Date.parse('2026-10-20T20:20:20.000Z')}`,
    );
  });

  it('mantiene la URL sin versionar cuando no se indica versión', () => {
    render(
      <ExternalImage
        src="https://i.ibb.co/abc/plato.jpg"
        alt="Plato"
        fallback={<span>Sin foto</span>}
      />,
    );

    expect(screen.getByAltText('Plato')).toHaveAttribute(
      'src',
      'https://i.ibb.co/abc/plato.jpg',
    );
  });

  it('vuelve a mostrar la imagen cuando solo cambia la versión', () => {
    const { rerender } = render(
      <ExternalImage
        src="https://i.ibb.co/abc/plato.jpg"
        alt="Plato"
        version="v1"
        fallback={<span>Sin foto</span>}
      />,
    );

    fireEvent.error(screen.getByAltText('Plato'));
    expect(screen.getByText('Sin foto')).toBeInTheDocument();

    rerender(
      <ExternalImage
        src="https://i.ibb.co/abc/plato.jpg"
        alt="Plato"
        version="v2"
        fallback={<span>Sin foto</span>}
      />,
    );

    expect(screen.getByAltText('Plato')).toHaveAttribute(
      'src',
      'https://i.ibb.co/abc/plato.jpg?v=v2',
    );
    expect(screen.queryByText('Sin foto')).not.toBeInTheDocument();
  });

  it('muestra el respaldo de inmediato cuando la URL es un blob efímero', () => {
    render(
      <ExternalImage
        src="blob:https://menugran.app/7c9e6679-42"
        alt="Logo"
        fallback={<span>Sin foto</span>}
      />,
    );

    // Un `blob:` solo vive en la sesión que lo creó: en móvil/PWA nunca debe
    // montarse el <img> (fallaría asíncronamente y dejaría el hueco roto),
    // sino caer directo en el fallback limpio.
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
  });

  it('muestra el respaldo de inmediato cuando la URL es un objeto serializado', () => {
    render(
      <ExternalImage
        src="[object Object]"
        alt="Banner"
        fallback={<span>Sin foto</span>}
      />,
    );

    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.queryByAltText('Banner')).not.toBeInTheDocument();
  });
});
