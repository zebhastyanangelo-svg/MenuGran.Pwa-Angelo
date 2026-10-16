import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import type { OrderWithCustomer } from '../../hooks/useMerchantDashboardPage';
import type { MerchantPagoMovilInfo } from '../../services/merchantPaymentService';
import { PaymentReconciliationPanel } from './PaymentReconciliationPanel';

const PAGO_MOVIL: MerchantPagoMovilInfo = {
  bank: 'Banesco',
  idNumber: 'J-123456789',
  phone: '0412-1234567',
};

function buildOrder(overrides: Partial<OrderWithCustomer> = {}): OrderWithCustomer {
  return {
    id: 'order-1',
    merchant_id: 'm-1',
    customer_id: 'c-1',
    driver_id: null,
    type: 'delivery',
    status: 'payment_pending',
    payment_method: 'pago_movil',
    payment_reference: 'REF-9999',
    payment_proof_url: 'proofs/order-1.jpg',
    total_amount: '150.00',
    table_number: null,
    delivery_location: null,
    delivery_address_notes: null,
    delivery_address: null,
    latitude: null,
    longitude: null,
    items: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderPanel(order: OrderWithCustomer, canOperate = true) {
  const onOpenProof = vi.fn();
  const onValidatePayment = vi.fn();
  const onRequestReference = vi.fn();
  render(
    <PaymentReconciliationPanel
      order={order}
      pagoMovil={PAGO_MOVIL}
      bcvRate={10}
      canOperate={canOperate}
      onOpenProof={onOpenProof}
      onValidatePayment={onValidatePayment}
      onRequestReference={onRequestReference}
    />,
  );
  return { onOpenProof, onValidatePayment, onRequestReference };
}

describe('PaymentReconciliationPanel', () => {
  it('muestra los datos bancarios del comercio y el monto en ambas monedas', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('Banesco')).toBeInTheDocument();
    expect(screen.getByText('0412-1234567')).toBeInTheDocument();
    expect(screen.getByText('J-123456789')).toBeInTheDocument();
    expect(screen.getByText('REF-9999')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText(/1[.\s]?500,00/)).toBeInTheDocument();
  });

  it('muestra el banco con su código de institución', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('(0134)')).toBeInTheDocument();
  });

  it('normaliza un banco guardado como texto libre', () => {
    render(
      <PaymentReconciliationPanel
        order={buildOrder()}
        pagoMovil={{ ...PAGO_MOVIL, bank: 'Provincial' }}
        bcvRate={10}
        canOperate
        onOpenProof={vi.fn()}
        onValidatePayment={vi.fn()}
        onRequestReference={vi.fn()}
      />,
    );

    expect(screen.getByText('BBVA Provincial')).toBeInTheDocument();
    expect(screen.queryByText('Provincial')).not.toBeInTheDocument();
  });

  it('omite el código cuando el banco no está en el catálogo', () => {
    render(
      <PaymentReconciliationPanel
        order={buildOrder()}
        pagoMovil={{ ...PAGO_MOVIL, bank: 'Banco Cooperativo Local' }}
        bcvRate={10}
        canOperate
        onOpenProof={vi.fn()}
        onValidatePayment={vi.fn()}
        onRequestReference={vi.fn()}
      />,
    );

    expect(screen.getByText('Banco Cooperativo Local')).toBeInTheDocument();
    expect(screen.queryByText(/^\(\d{4}\)$/)).not.toBeInTheDocument();
  });

  it('avisa cuando el comercio no configuró sus datos de Pago Móvil', () => {
    render(
      <PaymentReconciliationPanel
        order={buildOrder()}
        pagoMovil={null}
        bcvRate={10}
        canOperate
        onOpenProof={vi.fn()}
        onValidatePayment={vi.fn()}
        onRequestReference={vi.fn()}
      />,
    );

    expect(screen.getAllByText('No configurado').length).toBeGreaterThan(0);
  });

  it('abre el comprobante al tocar la miniatura', async () => {
    const { onOpenProof } = renderPanel(buildOrder());

    await userEvent.click(screen.getByTestId('proof-button-order-1'));

    expect(onOpenProof).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando el cliente no adjuntó comprobante', () => {
    renderPanel(buildOrder({ payment_proof_url: null }));

    expect(screen.getByText(/no adjuntó comprobante/i)).toBeInTheDocument();
    expect(screen.queryByTestId('proof-button-order-1')).not.toBeInTheDocument();
  });

  it('omite la conciliación bancaria para métodos sin captura', () => {
    renderPanel(buildOrder({ payment_method: 'cash', payment_proof_url: null }));

    expect(screen.getByText(/no requiere comparar contra el banco/i)).toBeInTheDocument();
    expect(screen.queryByText('Banco emisor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('proof-button-order-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment-awaiting-alert')).not.toBeInTheDocument();
  });

  it('marca el pago como conciliado una vez confirmado', () => {
    renderPanel(buildOrder({ status: 'confirmed' }));

    expect(screen.getByTestId('payment-validated-alert')).toHaveTextContent(
      'Monto conciliado por caja',
    );
    expect(screen.getByTestId('payment-validated-alert')).toHaveTextContent(
      'Tasa oficial BCV sincronizada',
    );
  });

  it('avisa que falta la referencia bancaria', () => {
    renderPanel(buildOrder({ payment_reference: null }));

    expect(screen.getByTestId('payment-missing-reference-alert')).toBeInTheDocument();
    expect(screen.getByText('Sin referencia')).toBeInTheDocument();
  });

  it('deja el pago a la espera mientras siga en payment_pending', () => {
    renderPanel(buildOrder());

    expect(screen.getByTestId('payment-awaiting-alert')).toHaveTextContent(
      'Pendiente de validación contra el banco',
    );
  });

  it('avisa que la tasa BCV no está disponible en lugar de mostrar un monto vacío', () => {
    render(
      <PaymentReconciliationPanel
        order={buildOrder()}
        pagoMovil={PAGO_MOVIL}
        bcvRate={0}
        canOperate
        onOpenProof={vi.fn()}
        onValidatePayment={vi.fn()}
        onRequestReference={vi.fn()}
      />,
    );

    expect(screen.getByTestId('payment-awaiting-alert')).toHaveTextContent(
      'Tasa BCV no disponible',
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('ofrece validar el pago y solicitar la referencia al cajero', async () => {
    const { onValidatePayment, onRequestReference } = renderPanel(buildOrder());

    await userEvent.click(screen.getByTestId('validate-payment-order-1'));
    expect(onValidatePayment).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId('request-reference-order-1'));
    expect(onRequestReference).toHaveBeenCalledTimes(1);
  });

  it('oculta las acciones de validación para un tablero en solo lectura', () => {
    renderPanel(buildOrder(), false);

    expect(screen.queryByTestId('validate-payment-order-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('request-reference-order-1')).not.toBeInTheDocument();
  });

  it('retira las acciones cuando el pago ya fue validado', () => {
    renderPanel(buildOrder({ status: 'preparing' }));

    expect(screen.queryByTestId('validate-payment-order-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('request-reference-order-1')).not.toBeInTheDocument();
  });
});
