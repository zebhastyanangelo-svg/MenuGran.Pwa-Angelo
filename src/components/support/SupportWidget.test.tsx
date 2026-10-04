import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportWidget } from './SupportWidget';

async function openWidget(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('support-fab'));
  return screen.findByRole('heading', { name: /Ayuda y soporte/i });
}

describe('SupportWidget', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('arranca cerrado y sólo muestra el botón flotante', () => {
    render(<SupportWidget />);

    expect(screen.getByTestId('support-fab')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Ayuda y soporte/i })).not.toBeInTheDocument();
  });

  it('abre el panel con el triage y las categorías', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    expect(screen.getByText('¿Qué necesitas?')).toBeInTheDocument();
    expect(screen.getByText('Mis pedidos')).toBeInTheDocument();
    expect(screen.getByText('Entregas')).toBeInTheDocument();
  });

  it('se cierra con el botón de cerrar', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /Cerrar ayuda/i }));

    expect(screen.getByTestId('support-fab')).toBeInTheDocument();
  });

  it('navega el flujo guiado hasta un artículo', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /¿Qué necesitas\?/ }));
    await user.click(
      screen.getByRole('button', { name: /Un pedido que no llega o no avanza/i }),
    );

    expect(screen.getByText('¿En qué punto está el pedido?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Está confirmado pero no avanza/i }));

    expect(
      screen.getByText('Mi pedido lleva mucho sin moverse. ¿Qué hago?'),
    ).toBeInTheDocument();
  });

  it('filtra la lista al elegir una categoría', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /Mi menú/i }));

    expect(
      screen.getByText('¿Cómo agrego o edito un producto en mi menú?'),
    ).toBeInTheDocument();
    expect(screen.queryByText('¿Cómo sé en qué estado está mi pedido?')).not.toBeInTheDocument();
  });

  it('busca sin distinguir mayúsculas ni acentos', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    // Entra al buscador vía una categoría y luego quita el filtro.
    await user.click(screen.getByRole('button', { name: /Mis pedidos/i }));
    await user.click(screen.getByRole('button', { name: /Ver todos los temas/i }));
    await user.type(screen.getByRole('searchbox'), 'MÓVIL');

    // "móvil" sólo aparece con acento en el artículo de pagos.
    expect(screen.getByText('Mi pago quedó pendiente. ¿Qué hago?')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando la búsqueda no arroja resultados', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /Mis pedidos/i }));
    await user.type(screen.getByRole('searchbox'), 'helicoptero');

    expect(screen.getByText(/No encontramos nada/i)).toBeInTheDocument();
  });

  it('abre un artículo y ofrece los relacionados', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /Mis pedidos/i }));
    await user.click(
      screen.getByRole('button', { name: /¿Cómo sé en qué estado está mi pedido\?/ }),
    );

    expect(screen.getByText('Ver también')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Mi pedido lleva mucho sin moverse/i,
      }),
    ).toBeInTheDocument();
  });

  it('vuelve al inicio desde un artículo', async () => {
    render(<SupportWidget />);
    await openWidget(user);

    await user.click(screen.getByRole('button', { name: /Mis pedidos/i }));
    await user.click(
      screen.getByRole('button', { name: /¿Cómo sé en qué estado está mi pedido\?/ }),
    );

    await user.click(screen.getByRole('button', { name: /Volver al inicio de la ayuda/i }));

    expect(screen.getByText('¿Qué necesitas?')).toBeInTheDocument();
  });
});