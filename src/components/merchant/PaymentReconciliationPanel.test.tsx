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
    // Datos que el cliente declaró en el checkout. Deliberadamente distintos
    // de `PAGO_MOVIL` (la cuenta del comercio) para que las pruebas demuestren
    // que la conciliación lee el pago reportado por el cliente.
    payer_bank: 'Mercantil',
    payer_phone: '0414-9876543',
    payer_id_number: 'V87654321',
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
  it('muestra el pago reportado por el cliente y el monto en ambas monedas', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('Mercantil')).toBeInTheDocument();
    expect(screen.getByText('0414-9876543')).toBeInTheDocument();
    expect(screen.getByText('V87654321')).toBeInTheDocument();
    expect(screen.getByText('REF-9999')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText(/1[.\s]?500,00/)).toBeInTheDocument();
  });

  it('etiqueta los cuatro campos de la conciliación con Banco, Teléfono, Cédula / RIF y Referencia', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('Banco')).toBeInTheDocument();
    expect(screen.getByText('Teléfono')).toBeInTheDocument();
    expect(screen.getByText('Cédula / RIF')).toBeInTheDocument();
    expect(screen.getByText('Referencia')).toBeInTheDocument();
  });

  it('elimina la sección redundante de datos de quien paga', () => {
    renderPanel(buildOrder());

    expect(screen.queryByText('Datos de quien paga')).not.toBeInTheDocument();
  });

  it('confronta el pago del cliente y no la cuenta receptora del comercio', () => {
    renderPanel(buildOrder());

    // `PAGO_MOVIL` describe la cuenta del comercio: el panel ya no la muestra,
    // porque la conciliación parte de lo que declaró el cliente.
    expect(screen.queryByText('Banesco')).not.toBeInTheDocument();
    expect(screen.queryByText('0412-1234567')).not.toBeInTheDocument();
    expect(screen.queryByText('J-123456789')).not.toBeInTheDocument();
    expect(screen.queryByText('Banco receptor')).not.toBeInTheDocument();
    expect(screen.queryByText('Teléfono receptor')).not.toBeInTheDocument();
    expect(screen.queryByText('Cédula / RIF del comercio')).not.toBeInTheDocument();
  });

  it('muestra el banco con su código de institución', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('(0105)')).toBeInTheDocument();
  });

  it('normaliza un banco guardado como texto libre', () => {
    renderPanel(buildOrder({ payer_bank: 'Provincial' }));

    expect(screen.getByText('BBVA Provincial')).toBeInTheDocument();
    expect(screen.queryByText('Provincial')).not.toBeInTheDocument();
  });

  it('omite el código cuando el banco no está en el catálogo', () => {
    renderPanel(buildOrder({ payer_bank: 'Banco Cooperativo Local' }));

    expect(screen.getByText('Banco Cooperativo Local')).toBeInTheDocument();
    expect(screen.queryByText(/^\(\d{4}\)$/)).not.toBeInTheDocument();
  });

  it('avisa que el cliente no declaró los datos del pago', () => {
    renderPanel(
      buildOrder({ payer_bank: null, payer_phone: null, payer_id_number: null }),
    );

    expect(screen.getAllByText('No indicado')).toHaveLength(3);
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
    expect(screen.queryByText('Banco')).not.toBeInTheDocument();
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

  it('no deja un cero fantasma cuando el envío llega como número 0', () => {
    // PostgREST devuelve las columnas `numeric` como número, no como texto. Con
    // el valor `0` la expresión anterior pintaba un "0" suelto justo debajo del
    // monto en bolívares, ensuciando el bloque de montos.
    renderPanel(buildOrder({ delivery_fee: 0 as unknown as string }));

    const amounts = screen.getByTestId('payment-amounts');
    expect(amounts.children).toHaveLength(2);
    expect(amounts.textContent).toBe('Monto (USD)$150.00Monto (Bs.)Bs. 1.500,00');
    expect(screen.queryByText('Envío')).not.toBeInTheDocument();
  });

  it('muestra el envío cuando el comercio sí cobra tarifa', () => {
    renderPanel(buildOrder({ delivery_fee: '2.50' }));

    expect(screen.getByText('Envío')).toBeInTheDocument();
  });

  it('usa el formateador canónico de bolívares sin el símbolo "Bs.S"', () => {
    renderPanel(buildOrder());

    expect(screen.getByText('Bs. 1.500,00')).toBeInTheDocument();
    expect(screen.queryByText(/Bs\.S/)).not.toBeInTheDocument();
  });

  it('muestra los datos reales del pagador declarados en el checkout', () => {
    renderPanel(
      buildOrder({
        payer_bank: 'Provincial',
        payer_phone: '0414-9876543',
        payer_id_number: 'V87654321',
      }),
    );

    expect(screen.getByText('BBVA Provincial')).toBeInTheDocument();
    expect(screen.getByText('(0108)')).toBeInTheDocument();
    expect(screen.getByText('0414-9876543')).toBeInTheDocument();
    expect(screen.getByText('V87654321')).toBeInTheDocument();
  });

  it('distingue la cuenta receptora del comercio de la del cliente', () => {
    renderPanel(buildOrder());

    // La cuenta del comercio era el dato duplicado que la caja no necesita para
    // validar: la conciliación se hace contra el pago reportado por el cliente.
    expect(screen.queryByText('Banco receptor')).not.toBeInTheDocument();
    expect(screen.queryByText('Teléfono receptor')).not.toBeInTheDocument();
    expect(screen.queryByText('Cédula / RIF del comercio')).not.toBeInTheDocument();
    // Y se muestra la del cliente, no la del comercio.
    expect(screen.getByText('Mercantil')).toBeInTheDocument();
  });

  it('avisa que el cliente no declaró datos del pagador', () => {
    renderPanel(buildOrder({ payer_bank: null, payer_phone: null, payer_id_number: null }));

    // Banco, teléfono y cédula caen en el mismo texto de reserva.
    expect(screen.getAllByText('No indicado')).toHaveLength(3);
  });

  it('omite los datos del pagador en métodos sin captura', () => {
    renderPanel(buildOrder({ payment_method: 'cash', payment_proof_url: null }));

    expect(screen.queryByText('Datos de quien paga')).not.toBeInTheDocument();
    expect(screen.queryByText('Cédula / RIF')).not.toBeInTheDocument();
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
