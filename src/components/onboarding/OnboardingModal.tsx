import { useState } from 'react';
import { CreditCard, MapPin, ShoppingCart } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Explora los comercios cercanos',
    description:
      'Navega por el catálogo de MenuGram y descubre los comercios abiertos cerca de ti, con sus menús, precios en dólares y su ubicación exacta en el mapa.',
    icon: <MapPin className="h-10 w-10" aria-hidden="true" />,
  },
  {
    title: 'Arma tu pedido',
    description:
      'Agrega tus platillos favoritos al carrito y elige cómo quieres disfrutarlos: Delivery a tu puerta o Retiro en Local (Pickup). ¡Tú decides!',
    icon: <ShoppingCart className="h-10 w-10" aria-hidden="true" />,
  },
  {
    title: 'Adjunta tu Pago Móvil y Rastrea',
    description:
      'Adjunta el comprobante de Pago Móvil directamente desde la galería de fotos de tu teléfono y sigue tu pedido en tiempo real con el código de entrega.',
    icon: <CreditCard className="h-10 w-10" aria-hidden="true" />,
  },
];

interface OnboardingModalProps {
  /** Se invoca al finalizar el tutorial o al saltarlo. */
  onFinish: () => void;
}

/**
 * Tutorial interactivo de onboarding para clientes nuevos de MenuGram.
 * Tres pasos animados (CSS transitions + animate-slide-up) con navegación,
 * indicador de progreso y botón "Saltar" disponible en cualquier paso.
 */
export function OnboardingModal({ onFinish }: OnboardingModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const isLastStep = activeStep === ONBOARDING_STEPS.length - 1;
  const step = ONBOARDING_STEPS[activeStep];

  const goToStep = (nextStep: number) => {
    const clamped = Math.min(Math.max(nextStep, 0), ONBOARDING_STEPS.length - 1);
    setActiveStep(clamped);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div className="animate-slide-up relative m-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onFinish}
          className="absolute right-4 top-4 rounded-lg px-2 py-1 text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          Saltar
        </button>

        <p className="text-xs font-semibold uppercase tracking-widest text-brand-red">
          Paso {activeStep + 1} de {ONBOARDING_STEPS.length}
        </p>

        <div key={activeStep} className="animate-slide-up mt-4 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
            {step.icon}
          </div>
          <h2 id="onboarding-step-title" className="mt-4 text-xl font-bold text-slate-900">
            {step.title}
          </h2>
          <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-slate-600">
            {step.description}
          </p>
        </div>

        <div className="mt-2 flex justify-center gap-2" aria-hidden="true">
          {ONBOARDING_STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeStep ? 'w-6 bg-brand-red' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => goToStep(activeStep - 1)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
            >
              Anterior
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLastStep ? onFinish() : goToStep(activeStep + 1))}
            className="flex-1 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            {isLastStep ? 'Entendido, ¡Comenzar a pedir!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
