import { useMemo, useState } from 'react';
import { Bike, Loader2, Send, Store as StoreIcon, Utensils } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StarRating } from './StarRating';
import { useNotificationToast } from '../pwa/useNotificationToast';
import { markSurveyAnswered, markSurveyDismissed } from '../../utils/surveyStorage';
import {
  buildSurveySteps,
  PLATFORM_IMPROVEMENT_OPTIONS,
  QUALITY_OPTION_LABELS,
  SPEED_OPTION_LABELS,
  submitOrderRating,
  validateSurveyAnswers,
  type SurveyStep,
} from '../../services/orderRatingService';
import type {
  OrderRow,
  SurveyImprovementOption,
  SurveyQualityOption,
  SurveySpeedOption,
} from '../../types/database';

export interface PostOrderSurveyModalProps {
  order: OrderRow;
  onClose: () => void;
}

interface SurveyDraft {
  merchantStars: number;
  merchantSpeed: SurveySpeedOption | null;
  merchantServiceQuality: SurveyQualityOption | null;
  driverStars: number | null;
  driverSpeed: SurveySpeedOption | null;
  driverTreatment: SurveyQualityOption | null;
  platformStars: number;
  platformImprovements: SurveyImprovementOption[];
  platformComment: string;
}

const INITIAL_DRAFT: SurveyDraft = {
  merchantStars: 0,
  merchantSpeed: null,
  merchantServiceQuality: null,
  driverStars: null,
  driverSpeed: null,
  driverTreatment: null,
  platformStars: 0,
  platformImprovements: [],
  platformComment: '',
};

const CHIP_BASE =
  'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red';

function OptionChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  name,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T | null;
  onChange: (option: T) => void;
  ariaLabel: string;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            onClick={() => onChange(option.key)}
            className={`${CHIP_BASE} ${
              isSelected
                ? 'border-brand-red bg-brand-red text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-red/40 hover:bg-red-50/50'
            }`}
            data-testid={`chip-${name}-${option.key}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SurveyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {children}
    </div>
  );
}

/** Encabezado del paso actual con icono y progreso. */
function StepHeader({
  step,
  index,
  total,
}: {
  step: SurveyStep;
  index: number;
  total: number;
}) {
  const config = {
    business: {
      icon: <StoreIcon className="h-5 w-5 text-brand-red" aria-hidden="true" />,
      title: '¿Cómo estuvo el negocio?',
    },
    delivery: {
      icon: <Bike className="h-5 w-5 text-brand-red" aria-hidden="true" />,
      title: '¿Cómo estuvo el repartidor?',
    },
    platform: {
      icon: <Utensils className="h-5 w-5 text-brand-red" aria-hidden="true" />,
      title: '¿Cómo estuvo MenuGran?',
    },
  }[step];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {config.icon}
        <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
      </div>
      <span className="text-xs font-medium text-slate-400" data-testid="survey-step-progress">
        Paso {index + 1} de {total}
      </span>
    </div>
  );
}

/**
 * Modal secuencial de la encuesta post-pedido.
 *
 * Tras la entrega el cliente califica en orden: negocio → repartidor (solo si
 * el pedido era de delivery con repartidor) → plataforma MenuGran. Las
 * estrellas del negocio impactan su visibilidad en el marketplace; una nota
 * baja al repartidor dispara la alerta al superadmin y al dueño.
 */
export function PostOrderSurveyModal({ order, onClose }: PostOrderSurveyModalProps) {
  const { showToast } = useNotificationToast();
  const steps = useMemo(() => buildSurveySteps(order), [order]);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<SurveyDraft>(INITIAL_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleDismiss = () => {
    markSurveyDismissed(order.id);
    onClose();
  };

  const handleContinue = () => {
    setError(null);
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleSubmit = async () => {
    setError(null);

    const answers = {
      merchantStars: draft.merchantStars,
      merchantSpeed: draft.merchantSpeed ?? 'normal',
      merchantServiceQuality: draft.merchantServiceQuality ?? 'normal',
      driverStars: currentStepIncludesDelivery(steps) ? draft.driverStars : null,
      driverSpeed: currentStepIncludesDelivery(steps) ? draft.driverSpeed : null,
      driverTreatment: currentStepIncludesDelivery(steps) ? draft.driverTreatment : null,
      platformStars: draft.platformStars,
      platformImprovements: draft.platformImprovements,
      platformComment: draft.platformComment.trim() === '' ? null : draft.platformComment.trim(),
    };

    const validationError = validateSurveyAnswers(steps, answers);
    if (validationError !== null) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await submitOrderRating(order, answers, steps);
      markSurveyAnswered(order.id);
      showToast({
        title: '¡Gracias por tu calificación!',
        message: 'Tu opinión nos ayuda a mejorar el servicio.',
        variant: 'success',
        durationMs: 5000,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu calificación.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Valida el paso visible antes de avanzar o enviar. */
  const validateCurrentStep = (): string | null => {
    if (currentStep === 'business') {
      if (draft.merchantStars < 1) return 'Califica al negocio con estrellas para continuar.';
      if (draft.merchantSpeed === null) return 'Indica la velocidad del negocio.';
      if (draft.merchantServiceQuality === null) return 'Indica la calidad del servicio.';
    }
    if (currentStep === 'delivery') {
      if (draft.driverStars === null || draft.driverStars < 1) {
        return 'Califica al repartidor con estrellas para continuar.';
      }
      if (draft.driverSpeed === null) return 'Indica la velocidad de entrega.';
      if (draft.driverTreatment === null) return 'Indica el trato recibido.';
    }
    if (currentStep === 'platform') {
      if (draft.platformStars < 1) return 'Califica a MenuGran con estrellas para continuar.';
      if (
        draft.platformImprovements.includes('otro') &&
        draft.platformComment.trim() === ''
      ) {
        return 'Cuéntanos qué podemos mejorar (opción "Otro").';
      }
    }
    return null;
  };

  const handlePrimaryAction = () => {
    const stepError = validateCurrentStep();
    if (stepError !== null) {
      setError(stepError);
      return;
    }
    if (isLastStep) {
      void handleSubmit();
    } else {
      handleContinue();
    }
  };

  const toggleImprovement = (option: SurveyImprovementOption) => {
    setDraft((prev) => ({
      ...prev,
      platformImprovements: prev.platformImprovements.includes(option)
        ? prev.platformImprovements.filter((item) => item !== option)
        : [...prev.platformImprovements, option],
    }));
  };

  return (
    <Modal
      isOpen
      onClose={handleDismiss}
      title="Califica tu experiencia"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
            data-testid="survey-dismiss"
          >
            {stepIndex === 0 ? 'Ahora no' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c80024] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="survey-primary-action"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLastStep ? (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar calificación
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5" data-testid="post-order-survey">
        <StepHeader step={currentStep} index={stepIndex} total={steps.length} />

        {currentStep === 'business' && (
          <div className="space-y-4">
            <SurveyField label="Calificación del negocio">
              <StarRating
                value={draft.merchantStars}
                ariaLabel="Calificación del negocio"
                disabled={submitting}
                onChange={(stars) =>
                  setDraft((prev) => ({ ...prev, merchantStars: stars }))
                }
              />
            </SurveyField>
            <SurveyField label="Velocidad">
              <OptionChips
                name="merchant-speed"
                ariaLabel="Velocidad del negocio"
                options={Object.entries(SPEED_OPTION_LABELS).map(([key, label]) => ({
                  key: key as SurveySpeedOption,
                  label,
                }))}
                value={draft.merchantSpeed}
                onChange={(option) => setDraft((prev) => ({ ...prev, merchantSpeed: option }))}
              />
            </SurveyField>
            <SurveyField label="Calidad del servicio">
              <OptionChips
                name="merchant-quality"
                ariaLabel="Calidad del servicio del negocio"
                options={Object.entries(QUALITY_OPTION_LABELS).map(([key, label]) => ({
                  key: key as SurveyQualityOption,
                  label,
                }))}
                value={draft.merchantServiceQuality}
                onChange={(option) =>
                  setDraft((prev) => ({ ...prev, merchantServiceQuality: option }))
                }
              />
            </SurveyField>
          </div>
        )}

        {currentStep === 'delivery' && (
          <div className="space-y-4">
            <SurveyField label="Calificación del repartidor">
              <StarRating
                value={draft.driverStars ?? 0}
                ariaLabel="Calificación del repartidor"
                disabled={submitting}
                onChange={(stars) => setDraft((prev) => ({ ...prev, driverStars: stars }))}
              />
            </SurveyField>
            <SurveyField label="Velocidad de entrega">
              <OptionChips
                name="driver-speed"
                ariaLabel="Velocidad de entrega del repartidor"
                options={Object.entries(SPEED_OPTION_LABELS).map(([key, label]) => ({
                  key: key as SurveySpeedOption,
                  label,
                }))}
                value={draft.driverSpeed}
                onChange={(option) => setDraft((prev) => ({ ...prev, driverSpeed: option }))}
              />
            </SurveyField>
            <SurveyField label="Trato recibido">
              <OptionChips
                name="driver-treatment"
                ariaLabel="Trato recibido del repartidor"
                options={Object.entries(QUALITY_OPTION_LABELS).map(([key, label]) => ({
                  key: key as SurveyQualityOption,
                  label,
                }))}
                value={draft.driverTreatment}
                onChange={(option) => setDraft((prev) => ({ ...prev, driverTreatment: option }))}
              />
            </SurveyField>
          </div>
        )}

        {currentStep === 'platform' && (
          <div className="space-y-4">
            <SurveyField label="Puntuación general de MenuGran">
              <StarRating
                value={draft.platformStars}
                ariaLabel="Puntuación general de MenuGran"
                disabled={submitting}
                onChange={(stars) => setDraft((prev) => ({ ...prev, platformStars: stars }))}
              />
            </SurveyField>
            <SurveyField label="¿Qué podemos mejorar? (opcional)">
              <div className="flex flex-wrap gap-2">
                {PLATFORM_IMPROVEMENT_OPTIONS.map((option) => {
                  const isSelected = draft.platformImprovements.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleImprovement(option.key)}
                      className={`${CHIP_BASE} ${
                        isSelected
                          ? 'border-brand-red bg-brand-red text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-red/40 hover:bg-red-50/50'
                      }`}
                      data-testid={`improvement-${option.key}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </SurveyField>
            {draft.platformImprovements.includes('otro') && (
              <SurveyField label="Cuéntanos qué podemos mejorar">
                <textarea
                  value={draft.platformComment}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, platformComment: event.target.value }))
                  }
                  maxLength={500}
                  rows={3}
                  disabled={submitting}
                  placeholder="Escribe tu comentario…"
                  aria-label="Comentario de mejora"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  data-testid="survey-comment"
                />
              </SurveyField>
            )}
          </div>
        )}

        {error !== null && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            data-testid="survey-error"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function currentStepIncludesDelivery(steps: readonly SurveyStep[]): boolean {
  return steps.includes('delivery');
}
