import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NavigationInstructionBar,
  NavigationSideControls,
  NavigationPersonCard,
} from './NavigationTrackingOverlay';

describe('NavigationInstructionBar', () => {
  it('muestra flecha, instrucción en negrita y distancia', () => {
    render(
      <NavigationInstructionBar
        icon="turn-right"
        text="Gira a la derecha"
        distanceLabel="290 m"
      />,
    );

    const bar = screen.getByTestId('navigation-instruction-bar');
    expect(bar).toBeInTheDocument();
    expect(screen.getByText('Gira a la derecha')).toBeInTheDocument();
    expect(screen.getByTestId('instruction-distance')).toHaveTextContent('290 m');
  });

  it('oculta la distancia cuando llega vacía', () => {
    render(
      <NavigationInstructionBar icon="arrive" text="Llegaste a tu destino" distanceLabel="" />,
    );

    expect(screen.queryByTestId('instruction-distance')).not.toBeInTheDocument();
  });

  it('cae a la flecha recta con iconos desconocidos', () => {
    render(
      <NavigationInstructionBar
        icon={'icono-falso' as never}
        text="Sigue derecho"
        distanceLabel="120 m"
      />,
    );

    expect(screen.getByText('Sigue derecho')).toBeInTheDocument();
  });
});

describe('NavigationSideControls', () => {
  it('alterna el silencio del audio', async () => {
    const user = userEvent.setup();
    const onToggleMute = vi.fn();

    render(
      <NavigationSideControls
        muted={false}
        onToggleMute={onToggleMute}
        onReorient={vi.fn()}
        onCenter={vi.fn()}
      />,
    );

    const muteButton = screen.getByTestId('toggle-mute-button');
    expect(muteButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(muteButton);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('muestra icono de silenciado cuando el audio está apagado', () => {
    render(
      <NavigationSideControls
        muted={true}
        onToggleMute={vi.fn()}
        onReorient={vi.fn()}
        onCenter={vi.fn()}
      />,
    );

    expect(screen.getByTestId('toggle-mute-button')).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByLabelText('Activar audio de navegación'),
    ).toBeInTheDocument();
  });

  it('dispara reorientación y centrado desde sus botones', async () => {
    const user = userEvent.setup();
    const onReorient = vi.fn();
    const onCenter = vi.fn();

    render(
      <NavigationSideControls
        muted={false}
        onToggleMute={vi.fn()}
        onReorient={onReorient}
        onCenter={onCenter}
      />,
    );

    await user.click(screen.getByTestId('reorient-button'));
    await user.click(screen.getByTestId('center-button'));

    expect(onReorient).toHaveBeenCalledTimes(1);
    expect(onCenter).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('center-button')).toHaveTextContent('Centrar');
  });
});

describe('NavigationPersonCard', () => {
  const baseProps = {
    etaLine: '14 min · 6.63 km · 04:51 p. m.',
    sectionLabel: 'REPARTIDOR:',
    name: 'Luis Ramírez',
  };

  it('muestra la línea de ETA en grande y el subtítulo de sección', () => {
    render(<NavigationPersonCard {...baseProps} />);

    expect(screen.getByTestId('navigation-eta')).toHaveTextContent('14 min · 6.63 km · 04:51 p. m.');
    expect(screen.getByText('REPARTIDOR:')).toBeInTheDocument();
    expect(screen.getByText('Luis Ramírez')).toBeInTheDocument();
  });

  it('muestra verificación, calificación y detalle adicional', () => {
    render(
      <NavigationPersonCard
        {...baseProps}
        verified
        rating={5}
        detailLabel="Propina: $2.00"
      />,
    );

    expect(screen.getByTestId('person-verified-badge')).toHaveTextContent('Verificado');
    expect(screen.getByTestId('person-rating')).toHaveTextContent('5.0');
    expect(screen.getByTestId('person-detail')).toHaveTextContent('Propina: $2.00');
  });

  it('oculta verificación, calificación y detalle cuando no aplican', () => {
    render(<NavigationPersonCard {...baseProps} />);

    expect(screen.queryByTestId('person-verified-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('person-rating')).not.toBeInTheDocument();
    expect(screen.queryByTestId('person-detail')).not.toBeInTheDocument();
  });

  it('usa el monograma del nombre cuando no hay avatar', () => {
    render(<NavigationPersonCard {...baseProps} name="Ana Torres" />);

    expect(screen.getByText('AT')).toBeInTheDocument();
  });

  it('muestra el botón de llamada con el teléfono y dispara el chat', async () => {
    const user = userEvent.setup();
    const onChat = vi.fn();

    render(
      <NavigationPersonCard
        {...baseProps}
        phone="+584141234567"
        onChat={onChat}
      />,
    );

    expect(screen.getByTestId('person-call-button')).toHaveAttribute('href', 'tel:+584141234567');
    await user.click(screen.getByTestId('person-chat-button'));
    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it('oculta llamada y chat sin datos', () => {
    render(<NavigationPersonCard {...baseProps} />);

    expect(screen.queryByTestId('person-call-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('person-chat-button')).not.toBeInTheDocument();
  });

  it('renderiza la barra de acción principal a ancho completo', () => {
    render(
      <NavigationPersonCard
        {...baseProps}
        primaryAction={<button type="button">Confirmar pedido recibido</button>}
      />,
    );

    expect(screen.getByTestId('person-primary-action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pedido recibido' })).toBeInTheDocument();
  });
});
