import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { ContactCard } from './ContactCard';

function renderCard(overrides: Partial<React.ComponentProps<typeof ContactCard>> = {}) {
  return render(
    <ContactCard title="Tu repartidor" name="Carlos Pérez" phone="+584141234567" {...overrides} />,
  );
}

describe('ContactCard', () => {
  it('muestra el nombre y el teléfono de la persona', () => {
    renderCard();

    expect(screen.getByTestId('contact-name')).toHaveTextContent('Carlos Pérez');
    expect(screen.getByTestId('contact-phone')).toHaveTextContent('+584141234567');
  });

  it('ofrece un botón de llamada con la URL tel normalizada', () => {
    renderCard({ phone: '0414-1234567' });

    const callButton = screen.getByTestId('contact-call-button');
    expect(callButton).toHaveAttribute('href', 'tel:+584141234567');
    expect(callButton).toHaveAttribute('aria-label', 'Llamar a Carlos Pérez');
  });

  it('muestra el botón de WhatsApp solo cuando se pide y hay teléfono', () => {
    const { unmount } = renderCard({ showWhatsApp: true });

    expect(screen.getByTestId('contact-whatsapp-button')).toHaveAttribute(
      'href',
      'https://wa.me/584141234567',
    );
    unmount();

    renderCard();
    expect(screen.queryByTestId('contact-whatsapp-button')).not.toBeInTheDocument();
  });

  it('omite los botones y avisa cuando no hay teléfono', () => {
    renderCard({ phone: null });

    expect(screen.queryByTestId('contact-call-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contact-whatsapp-button')).not.toBeInTheDocument();
    expect(screen.getByText(/no registró un teléfono/i)).toBeInTheDocument();
  });

  it('usa un nombre de respaldo cuando el repartidor no tiene nombre', () => {
    renderCard({ name: 'Repartidor asignado' });

    expect(screen.getByTestId('contact-name')).toHaveTextContent('Repartidor asignado');
  });
});