import { useNavigate } from 'react-router-dom';
import { Bike, Store } from 'lucide-react';
import { getPostOnboardingPath, type ServiceMode } from '../../utils/serviceMode';

export interface ServiceModeChooserProps {
  /** Callback con el modo elegido; quien lo monta persiste y navega. */
  onSelect: (mode: ServiceMode) => void;
}

interface ModeOption {
  mode: ServiceMode;
  title: string;
  description: string;
  icon: typeof Bike;
  testId: string;
}

const MODE_OPTIONS: readonly ModeOption[] = [
  {
    mode: 'in_store',
    title: 'Estoy en el negocio',
    description: 'Escanea el código QR de tu mesa para ver el menú y pedir aquí mismo.',
    icon: Store,
    testId: 'service-mode-in-store',
  },
  {
    mode: 'delivery',
    title: 'Deseo delivery',
    description: 'Pide a los comercios cercanos y recibe tu pedido en la puerta.',
    icon: Bike,
    testId: 'service-mode-delivery',
  },
];

/**
 * Primera decisión tras iniciar sesión: "¿Estás en el negocio o deseas pedir
 * un delivery?".
 *
 * No es decorativa: fija el modo de servicio de la sesión. En "Estoy en el
 * negocio" el cliente va al lector de QR de mesa; en "Deseo delivery" va al
 * marketplace y el checkout ya no le vuelve a preguntar por el tipo de
 * despacho.
 *
 * Se presenta como modal a pantalla completa porque bloquea la navegación:
 * entrar al marketplace sin haber elegido dejaría al cliente en el flujo
 * equivocado.
 */
export function ServiceModeChooser({ onSelect }: ServiceModeChooserProps) {
  const navigate = useNavigate();

  function handleSelect(mode: ServiceMode) {
    onSelect(mode);
    navigate(getPostOnboardingPath(mode), { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-mode-title"
      data-testid="service-mode-chooser"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2
          id="service-mode-title"
          className="text-lg font-bold text-slate-900"
        >
          ¿Estás en el negocio o deseas pedir un delivery?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Así saberemos dónde mostrarte los comercios y cómo entregar tu pedido.
        </p>

        <div className="mt-5 space-y-3">
          {MODE_OPTIONS.map(({ mode, title, description, icon: Icon, testId }) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleSelect(mode)}
              data-testid={testId}
              className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-red hover:bg-red-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-brand-red">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  {title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}