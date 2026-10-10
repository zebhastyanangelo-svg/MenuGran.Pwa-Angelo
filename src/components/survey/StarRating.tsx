import { useState } from 'react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  /** Valor actual (0 = sin calificar). */
  value: number;
  /** Callback con la calificación seleccionada (1-5). */
  onChange: (stars: number) => void;
  /** Etiqueta accesible del grupo de estrellas. */
  ariaLabel: string;
  /** Deshabilita la interacción (enviando…). */
  disabled?: boolean;
}

/**
 * Calificación por estrellas (1 a 5) de la encuesta post-pedido.
 *
 * El foco/hover pinta las estrellas hasta el cursor para que el cliente vea
 * la nota que va a dejar antes de tocar; el teclado también funciona porque
 * cada estrella es un botón real.
 */
export function StarRating({ value, onChange, ariaLabel, disabled = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const activeStars = hovered > 0 ? hovered : value;

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={ariaLabel}
      onMouseLeave={() => setHovered(0)}
      data-testid="star-rating"
    >
      {[1, 2, 3, 4, 5].map((stars) => {
        const isActive = stars <= activeStars;
        return (
          <button
            key={stars}
            type="button"
            role="radio"
            aria-checked={value === stars}
            aria-label={`${stars} ${stars === 1 ? 'estrella' : 'estrellas'}`}
            disabled={disabled}
            onMouseEnter={() => setHovered(stars)}
            onFocus={() => setHovered(stars)}
            onClick={() => onChange(stars)}
            className={`rounded p-0.5 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed ${
              disabled ? '' : 'hover:scale-110'
            }`}
            data-testid={`star-${stars}`}
          >
            <Star
              className={`h-8 w-8 ${
                isActive ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
