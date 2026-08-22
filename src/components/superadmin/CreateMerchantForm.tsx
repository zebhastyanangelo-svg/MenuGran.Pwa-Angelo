import { useState, type FormEvent } from 'react';
import { Store } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  validateCreateMerchantInput,
  type CreateMerchantAccountInput,
} from '../../utils/merchantRegistration';

export interface CreateMerchantFormProps {
  onSubmit: (input: CreateMerchantAccountInput) => Promise<void>;
  isSubmitting?: boolean;
}

const EMPTY_INPUT: CreateMerchantAccountInput = {
  ownerFullName: '',
  ownerCi: '',
  ownerPhone: '',
  ownerEmail: '',
  businessName: '',
  businessRif: '',
};

/** Formulario de alta de comercios para el panel de Super Admin. */
export function CreateMerchantForm({
  onSubmit,
  isSubmitting = false,
}: CreateMerchantFormProps) {
  const [input, setInput] = useState<CreateMerchantAccountInput>(EMPTY_INPUT);
  const [formError, setFormError] = useState<string | null>(null);

  function updateField(field: keyof CreateMerchantAccountInput, value: string) {
    setInput((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCreateMerchantInput(input);
    if (validationError !== null) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    try {
      await onSubmit(input);
      setInput(EMPTY_INPUT);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el comercio.',
      );
    }
  }

  return (
    <form
      className="space-y-6"
      aria-label="Formulario de creación de negocio"
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <fieldset className="space-y-4" disabled={isSubmitting}>
        <legend className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Store className="h-4 w-4 text-brand-red" />
          Datos del propietario
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre del propietario"
            name="ownerFullName"
            autoComplete="name"
            value={input.ownerFullName}
            onChange={(event) => updateField('ownerFullName', event.target.value)}
          />
          <Input
            label="C.I."
            name="ownerCi"
            inputMode="text"
            value={input.ownerCi}
            onChange={(event) => updateField('ownerCi', event.target.value)}
          />
          <Input
            label="Teléfono"
            name="ownerPhone"
            type="tel"
            autoComplete="tel"
            value={input.ownerPhone}
            onChange={(event) => updateField('ownerPhone', event.target.value)}
          />
          <Input
            label="Email (credenciales de acceso)"
            name="ownerEmail"
            type="email"
            autoComplete="email"
            helperText="El comerciante iniciará sesión con este correo."
            value={input.ownerEmail}
            onChange={(event) => updateField('ownerEmail', event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={isSubmitting}>
        <legend className="text-sm font-semibold text-gray-900">
          Datos del negocio
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre del negocio (público)"
            name="businessName"
            helperText="Los clientes verán este nombre en la plataforma."
            value={input.businessName}
            onChange={(event) =>
              updateField('businessName', event.target.value)
            }
          />
          <Input
            label="RIF"
            name="businessRif"
            value={input.businessRif}
            onChange={(event) =>
              updateField('businessRif', event.target.value)
            }
          />
        </div>
      </fieldset>

      {formError !== null && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
        Crear negocio
      </Button>
    </form>
  );
}

export default CreateMerchantForm;
