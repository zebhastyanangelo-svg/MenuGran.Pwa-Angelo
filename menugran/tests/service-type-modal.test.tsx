// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import ServiceTypeModal from '@/modules/cart/ServiceTypeModal';

describe('ServiceTypeModal', () => {
  it('no renderiza nada cuando open=false', () => {
    const { container } = render(
      <ServiceTypeModal open={false} onClose={() => {}} onSubmit={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza las opciones MESA y DELIVERY', () => {
    render(<ServiceTypeModal open={true} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText(/En mesa/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery/i)).toBeInTheDocument();
  });

  it('al confirmar MESA llama onSubmit con serviceType=MESA y tableNumber', () => {
    const onSubmit = vi.fn();
    render(<ServiceTypeModal open={true} onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Número de mesa/i), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByText('Confirmar'));

    expect(onSubmit).toHaveBeenCalledWith({
      serviceType: 'MESA',
      tableNumber: 7,
    });
  });

  it('al cambiar a DELIVERY pide dirección y la envía en el payload', () => {
    const onSubmit = vi.fn();
    render(<ServiceTypeModal open={true} onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Delivery'));
    fireEvent.change(screen.getByLabelText(/Dirección de entrega/i), {
      target: { value: 'Av. Principal 123' },
    });
    fireEvent.click(screen.getByText('Confirmar'));

    expect(onSubmit).toHaveBeenCalledWith({
      serviceType: 'DELIVERY',
      deliveryAddress: 'Av. Principal 123',
    });
  });
});
