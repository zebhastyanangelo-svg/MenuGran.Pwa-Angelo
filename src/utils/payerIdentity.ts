import type { PayerIdentity } from '../services/checkoutService';

/**
 * Reglas de los datos de emisión del pago.
 *
 * La caja concili contra el banco emisor, el teléfono y la cédula: si falta uno
 * de los tres, la transferencia queda sin rastro. Por eso se validan en el
 * formulario y también en el paso de verificación previo al envío, que es el
 * que realmente bloquea el comprobante.
 */

/** `null` cuando los tres datos están completos; el mensaje a mostrar si no. */
export function validatePayerIdentity(payer: PayerIdentity): string | null {
  if (!payer.bank.trim()) {
    return 'Selecciona el banco desde el que hiciste la transferencia.';
  }
  if (!payer.phone.trim()) {
    return 'Ingresa el teléfono asociado al pago.';
  }
  if (!payer.idNumber.trim()) {
    return 'Ingresa la cédula asociada al pago.';
  }
  return null;
}

/** `true` cuando ambos conjuntos de datos declaran lo mismo. */
export function isSamePayerIdentity(
  left: PayerIdentity | null,
  right: PayerIdentity | null,
): boolean {
  if (left === null || right === null) return false;
  return (
    left.bank === right.bank &&
    left.phone === right.phone &&
    left.idNumber === right.idNumber
  );
}