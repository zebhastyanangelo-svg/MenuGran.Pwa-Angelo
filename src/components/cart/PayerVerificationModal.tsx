import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PayerIdentityFields } from './PayerIdentityFields';
import { validatePayerIdentity } from '../../utils/payerIdentity';
import type { PayerIdentity } from '../../services/checkoutService';

/**
 * Verificación obligatoria de los datos de emisión del pago.
 *
 * El comprobante no se envía en el primer clic: el cliente pasa por aquí para
 * confirmar que banco, teléfono y cédula son los de la transferencia que acaba
 * de hacer. Es obligatorio (sin botón de cerrar ni fondo que lo salte) porque
 * uno de esos tres datos equivocado deja el pago sin conciliar y obliga al
 * comercio a devolver el pedido.
 *
 * Todo sigue siendo editable aquí: si algo no coincide, se corrige en el mismo
 * paso y el comprobante sale con el dato bueno.
 */

export interface PayerVerificationModalProps {
  isOpen: boolean;
  /** Datos que se muestran y que el cliente puede corregir. */
  payer: PayerIdentity;
  /** Aplica las correcciones del cliente a los datos del formulario. */
  onChange: (patch: Partial<PayerIdentity>) => void;
  /** Habilita el envío definitivo del comprobante. */
  onConfirm: () => void;
  /** `true` mientras se sube el comprobante: evita confirmaciones dobles. */
  isProcessing: boolean;
}

function PayerVerificationBody({
  payer,
  onChange,
  onConfirm,
  isProcessing,
}: Omit<PayerVerificationModalProps, 'isOpen'>) {
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const invalid = validatePayerIdentity(payer);
    setError(invalid);
    if (invalid === null) onConfirm();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-gray-700">
        El comercio usa estos datos para encontrar tu transferencia en el banco.
        Revísalos antes de enviar el comprobante: si algo no coincide con lo que
        copiaste en la transferencia, corrígelo aquí.
      </p>

      <PayerIdentityFields
        payer={payer}
        onBankChange={(bank) => {
          setError(null);
          onChange({ bank });
        }}
        onPhoneChange={(phone) => {
          setError(null);
          onChange({ phone });
        }}
        onIdNumberChange={(idNumber) => {
          setError(null);
          onChange({ idNumber });
        }}
        idPrefix="verification"
      />

      {error && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          data-testid="payer-verification-error"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isProcessing}
        data-testid="confirm-payer-verification"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-red-dark disabled:opacity-60"
      >
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        Son correctos, enviar comprobante
      </button>
    </div>
  );
}

export function PayerVerificationModal({ isOpen, ...body }: PayerVerificationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      dismissible={false}
      title="Por favor verifica tus datos de emisión de pago"
    >
      <PayerVerificationBody {...body} />
    </Modal>
  );
}