/**
 * Modal flotante de perfil incompleto al intentar pedir.
 *
 * Bloquea por completo la acción de ordenar cuando al usuario le faltan
 * campos obligatorios de su perfil: explica qué falta, ofrece el botón
 * directo a su perfil y, si el usuario no actúa, lo redirige automáticamente
 * tras una cuenta regresiva corta (cancelable al cerrar el modal).
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, UserCircle2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';

/** Segundos de la cuenta regresiva antes de la redirección automática. */
export const PROFILE_REDIRECT_COUNTDOWN_SECONDS = 5;

export interface IncompleteProfileOrderModalProps {
  isOpen: boolean;
  /** Etiquetas de los campos obligatorios pendientes. */
  missingFields: string[];
  /** Lleva al usuario a su pantalla de perfil. */
  onGoToProfile: () => void;
  /** Cierra el modal y cancela la redirección automática. */
  onClose: () => void;
}

export function IncompleteProfileOrderModal({
  isOpen,
  missingFields,
  onGoToProfile,
  onClose,
}: IncompleteProfileOrderModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(PROFILE_REDIRECT_COUNTDOWN_SECONDS);

  // La cuenta regresiva vive solo con el modal abierto: al cerrar se cancela
  // y el próximo bloqueo arranca de nuevo.
  useEffect(() => {
    if (!isOpen) return undefined;

    setSecondsLeft(PROFILE_REDIRECT_COUNTDOWN_SECONDS);
    const countdown = setInterval(() => {
      setSecondsLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(countdown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (secondsLeft > 0) return;
    onGoToProfile();
  }, [isOpen, secondsLeft, onGoToProfile]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completa tu perfil para pedir"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-gray-700">
            No puedes realizar pedidos hasta completar los datos obligatorios de tu
            perfil. Es lo que usa el comercio para validar tu pago y entrega.
          </p>
        </div>

        {missingFields.length > 0 && (
          <ul className="space-y-1.5" data-testid="missing-profile-fields">
            {missingFields.map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                Falta: {field}
              </li>
            ))}
          </ul>
        )}

        <p
          className="text-xs text-gray-500"
          data-testid="profile-redirect-countdown"
        >
          Te llevaremos a tu perfil en {Math.max(secondsLeft, 0)} s para que lo completes
          antes de continuar con tu pedido.
        </p>

        <button
          type="button"
          onClick={onGoToProfile}
          data-testid="go-to-profile-button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#c80024]"
        >
          <UserCircle2 className="h-5 w-5" aria-hidden="true" />
          Ir a completar mi perfil
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl px-4 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
        >
          Seguir viendo mi carrito
        </button>
      </div>
    </Modal>
  );
}
