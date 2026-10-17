import { VenezuelanBankPicker } from './VenezuelanBankPicker';
import type { PayerIdentity } from '../../services/checkoutService';

/**
 * Datos de emisión del pago: banco emisor, teléfono y cédula / RIF.
 *
 * Es el bloque que la caja necesita para rastrear la transferencia, así que lo
 * comparten las dos pantallas donde el cliente lo declara o lo revisa: el
 * formulario de Pago Móvil y el modal de verificación previo al envío.
 *
 * Las etiquetas evitan la palabra "pagador": suena más natural y el contexto ya
 * dice de quién son los datos.
 */

export interface PayerIdentityFieldsProps {
  payer: PayerIdentity;
  onBankChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onIdNumberChange: (value: string) => void;
  /** `true` deja teléfono y cédula bloqueados: vienen precargados del perfil. */
  readOnlyPhoneAndId?: boolean;
  /** Prefijo de los `id`, para no chocar si el bloque se repite en pantalla. */
  idPrefix?: string;
}

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red';

function PayerTextField({
  id,
  label,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={
          readOnly
            ? 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600'
            : INPUT_CLASS
        }
      />
    </div>
  );
}

export function PayerIdentityFields({
  payer,
  onBankChange,
  onPhoneChange,
  onIdNumberChange,
  readOnlyPhoneAndId = false,
  idPrefix = 'payer',
}: PayerIdentityFieldsProps) {
  return (
    <div className="space-y-3">
      <VenezuelanBankPicker
        id={`${idPrefix}-bank`}
        label="Banco emisor"
        value={payer.bank}
        onChange={onBankChange}
        hint="El comercio lo usa para conciliar tu transferencia."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <PayerTextField
          id={`${idPrefix}-phone`}
          label="Teléfono"
          value={payer.phone}
          onChange={onPhoneChange}
          readOnly={readOnlyPhoneAndId}
          placeholder="Ej. 0412-1234567"
        />
        <PayerTextField
          id={`${idPrefix}-id-number`}
          label="Cédula / RIF"
          value={payer.idNumber}
          onChange={onIdNumberChange}
          readOnly={readOnlyPhoneAndId}
          placeholder="Ej. V12345678"
        />
      </div>
    </div>
  );
}