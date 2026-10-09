/**
 * HUD de navegación GPS profesional para el mapa de seguimiento.
 *
 * Tres piezas flotantes estilo Waze/Google Maps:
 *  - `NavigationInstructionBar`: barra superior con flecha de maniobra,
 *    instrucción en negrita y distancia restante.
 *  - `NavigationSideControls`: botones circulares a la derecha (silenciar
 *    audio, reorientar brújula) y el botón inferior separado "Centrar".
 *  - `NavigationPersonCard`: tarjeta inferior con ETA grande, el subtítulo de
 *    quién se busca (cliente o repartidor), datos de la persona con avatar,
 *    verificación y calificación, botones de llamada/chat en línea y la barra
 *    de acción principal a ancho completo.
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  BadgeCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ManeuverIconName } from '../../utils/navigationInstruction';

const MANEUVER_ICONS: Record<ManeuverIconName, LucideIcon> = {
  straight: ArrowUp,
  'turn-right': CornerUpRight,
  'turn-left': CornerUpLeft,
  'slight-right': CornerUpRight,
  'slight-left': CornerUpLeft,
  'sharp-right': CornerUpRight,
  'sharp-left': CornerUpLeft,
  uturn: CornerUpLeft,
  roundabout: Crosshair,
  merge: CornerUpRight,
  ramp: CornerUpRight,
  fork: CornerUpRight,
  depart: ArrowUp,
  arrive: MapPin,
};

export interface NavigationInstructionBarProps {
  /** Icono de la maniobra próxima (salida de `buildNavigationInstruction`). */
  icon: ManeuverIconName;
  /** Texto de la instrucción (ej. "Gira a la derecha"). */
  text: string;
  /** Distancia restante (ej. "290 m"). Vacío la oculta. */
  distanceLabel: string;
}

export function NavigationInstructionBar({ icon, text, distanceLabel }: NavigationInstructionBarProps) {
  const ManeuverIcon = MANEUVER_ICONS[icon] ?? ArrowUp;

  return (
    <div
      className="pointer-events-none absolute inset-x-3 top-3 z-20"
      data-testid="navigation-instruction-bar"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
          <ManeuverIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight text-gray-900">{text}</p>
          {distanceLabel !== '' && (
            <p className="mt-0.5 text-sm font-medium text-gray-500" data-testid="instruction-distance">
              {distanceLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export interface NavigationSideControlsProps {
  /** `true` cuando la guía de voz está silenciada. */
  muted: boolean;
  onToggleMute: () => void;
  /** Reorienta el mapa (centra al usuario y restablece el zoom de navegación). */
  onReorient: () => void;
  /** Centra el mapa en la posición actual sin cambiar el zoom. */
  onCenter: () => void;
  /** Posición del grupo vertical; configurable para esquivar la barra de instrucciones. */
  positionClass?: string;
  /** Posición del botón "Centrar"; configurable para esquivar la tarjeta inferior. */
  centerButtonClass?: string;
}

export function NavigationSideControls({
  muted,
  onToggleMute,
  onReorient,
  onCenter,
  positionClass = 'right-3 top-24',
  centerButtonClass = 'bottom-56 right-3',
}: NavigationSideControlsProps) {
  const MuteIcon = muted ? VolumeX : Volume2;

  return (
    <>
      <div
        className={`absolute z-20 flex flex-col gap-3 ${positionClass}`}
        data-testid="navigation-side-controls"
      >
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Activar audio de navegación' : 'Silenciar audio de navegación'}
          aria-pressed={muted}
          data-testid="toggle-mute-button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-black/5 transition hover:bg-gray-50 active:scale-95"
        >
          <MuteIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onReorient}
          aria-label="Reorientar mapa"
          data-testid="reorient-button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-black/5 transition hover:bg-gray-50 active:scale-95"
        >
          <Crosshair className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onCenter}
        data-testid="center-button"
        className={`absolute z-20 inline-flex h-12 items-center gap-2 rounded-full bg-brand-red px-4 text-sm font-semibold text-white shadow-xl ring-1 ring-black/10 transition hover:bg-[#c80024] active:scale-95 ${centerButtonClass}`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
        Centrar
      </button>
    </>
  );
}

export interface NavigationPersonCardProps {
  /** Línea grande de tiempo/distancia/llegada (ej. "14 min · 6.63 km · 04:51 p. m."). */
  etaLine: string;
  /** Subtítulo divisor: "BUSCANDO A:" o "REPARTIDOR:". */
  sectionLabel: string;
  /** Nombre completo de la persona. */
  name: string;
  /** Muestra la etiqueta "Verificado" con su icono. */
  verified?: boolean;
  /** Calificación de estrellas (ej. 5.0). */
  rating?: number | null;
  /** Avatar de la persona; sin URL se muestra el monograma del nombre. */
  avatarUrl?: string | null;
  /** Detalle adicional (dirección, propina, estado del viaje). */
  detailLabel?: string | null;
  /** Teléfono para el botón de llamada; sin teléfono se oculta. */
  phone?: string | null;
  /** Acción del botón de chat; sin acción se oculta. */
  onChat?: () => void;
  /** Barra de acción principal a ancho completo (botón o estado interactivo). */
  primaryAction?: ReactNode;
}

function buildMonogram(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return '?';
  const parts = trimmed.split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return initials.join('');
}

export function NavigationPersonCard({
  etaLine,
  sectionLabel,
  name,
  verified = false,
  rating = null,
  avatarUrl = null,
  detailLabel = null,
  phone = null,
  onChat,
  primaryAction,
}: NavigationPersonCardProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
      data-testid="navigation-person-card"
    >
      <p
        className="mb-2 text-xl font-extrabold tracking-tight text-gray-900"
        data-testid="navigation-eta"
      >
        {etaLine}
      </p>

      <div className="mb-3 flex items-center gap-2 border-t border-gray-100 pt-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-red" aria-hidden="true" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          {sectionLabel}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-red/20 bg-brand-red/10 text-sm font-bold text-brand-red">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            buildMonogram(name)
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-base font-bold text-gray-900">{name}</p>
            {verified && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                data-testid="person-verified-badge"
              >
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verificado
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {rating !== null && rating > 0 && (
              <span
                className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700"
                data-testid="person-rating"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {rating.toFixed(1)}
              </span>
            )}
            {detailLabel !== null && detailLabel !== '' && (
              <span className="truncate text-sm text-gray-500" data-testid="person-detail">
                {detailLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {phone !== null && phone !== '' && (
            <a
              href={`tel:${phone}`}
              aria-label="Llamar"
              data-testid="person-call-button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-1 ring-emerald-600/30 transition hover:bg-emerald-600 active:scale-95"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
          {onChat !== undefined && (
            <button
              type="button"
              onClick={onChat}
              aria-label="Chat"
              data-testid="person-chat-button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-red text-white shadow-md ring-1 ring-black/10 transition hover:bg-[#c80024] active:scale-95"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {primaryAction !== undefined && (
        <div className="mt-3" data-testid="person-primary-action">
          {primaryAction}
        </div>
      )}
    </div>
  );
}
