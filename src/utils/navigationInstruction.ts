/**
 * Instrucciones de navegación estilo GPS para el mapa de seguimiento.
 *
 * Traduce los pasos de OSRM (maniobra + calle + distancia) al HUD flotante:
 * flecha de dirección, texto de instrucción en negrita y distancia restante
 * en metros/kilómetros, más la línea de ETA de la tarjeta inferior.
 */

import type { OsrmRouteStep } from './osrmRoute';
import { haversineDistance } from './distance';

/** Icono (lucide) que representa la maniobra en la barra superior. */
export type ManeuverIconName =
  | 'straight'
  | 'turn-right'
  | 'turn-left'
  | 'slight-right'
  | 'slight-left'
  | 'sharp-right'
  | 'sharp-left'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'ramp'
  | 'fork'
  | 'depart'
  | 'arrive';

export interface NavigationInstruction {
  /** Icono de flecha que acompaña al texto. */
  icon: ManeuverIconName;
  /** Texto principal en negrita (ej. "Gira a la derecha"). */
  text: string;
  /** Distancia restante de la maniobra (ej. "290 m"). */
  distanceLabel: string;
  /** Vía del paso, cuando la maniobra la menciona. */
  streetName: string;
}

const DEFAULT_INSTRUCTION: NavigationInstruction = {
  icon: 'straight',
  text: 'Sigue derecho',
  distanceLabel: '',
  streetName: '',
};

/** Mapa (tipo + modificador) → texto de instrucción e icono. */
function describeTurnManeuver(modifier: string | undefined): Omit<NavigationInstruction, 'distanceLabel' | 'streetName'> | null {
  switch (modifier) {
    case 'right':
      return { icon: 'turn-right', text: 'Gira a la derecha' };
    case 'left':
      return { icon: 'turn-left', text: 'Gira a la izquierda' };
    case 'slight right':
      return { icon: 'slight-right', text: 'Mantente a la derecha' };
    case 'slight left':
      return { icon: 'slight-left', text: 'Mantente a la izquierda' };
    case 'sharp right':
      return { icon: 'sharp-right', text: 'Gira pronunciadamente a la derecha' };
    case 'sharp left':
      return { icon: 'sharp-left', text: 'Gira pronunciadamente a la izquierda' };
    case 'uturn':
      return { icon: 'uturn', text: 'Da la vuelta en U' };
    default:
      return null;
  }
}

/**
 * Construye la instrucción de la barra superior para un paso de OSRM.
 *
 * `arrive` marca el final del trayecto; `depart` y las continuaciones usan la
 * flecha recta. Maniobras desconocidas caen en "Sigue derecho" para que el
 * HUD nunca quede vacío.
 */
export function buildNavigationInstruction(step: OsrmRouteStep): NavigationInstruction {
  const { type, modifier } = step.maneuver;
  let description: Omit<NavigationInstruction, 'distanceLabel' | 'streetName'> | null = null;

  if (type === 'arrive') {
    description = { icon: 'arrive', text: 'Llegaste a tu destino' };
  } else if (type === 'turn' || type === 'end of road' || type === 'fork' || type === 'continue') {
    description = describeTurnManeuver(modifier);
    if (description === null && type === 'continue') {
      description = { icon: 'straight', text: 'Continúa' };
    }
    if (description === null && type === 'fork') {
      description = modifier?.includes('left')
        ? { icon: 'fork', text: 'Mantente a la izquierda' }
        : { icon: 'fork', text: 'Mantente a la derecha' };
    }
  } else if (type === 'roundabout' || type === 'rotary') {
    description = { icon: 'roundabout', text: 'Entra a la redondel' };
  } else if (type === 'merge') {
    description = { icon: 'merge', text: 'Incorpórate' };
  } else if (type === 'on ramp' || type === 'off ramp') {
    description = modifier?.includes('left')
      ? { icon: 'ramp', text: 'Toma la salida a la izquierda' }
      : { icon: 'ramp', text: 'Toma la salida a la derecha' };
  } else if (type === 'new name' || type === 'depart') {
    description = { icon: 'straight', text: 'Sigue derecho' };
  }

  const resolved = description ?? { icon: DEFAULT_INSTRUCTION.icon, text: DEFAULT_INSTRUCTION.text };

  return {
    ...resolved,
    distanceLabel: formatDistanceLabel(step.distanceMeters),
    streetName: step.name,
  };
}

/** Da formato de navegación a una distancia en metros: "290 m", "6.63 km". */
export function formatDistanceLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '';
  if (meters < 1000) {
    return `${Math.max(1, Math.round(meters))} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Duración de trayecto legible: "14 min" o "1 h 05 min". */
export function formatDurationLabel(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return '-- min';
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} h ${remaining.toString().padStart(2, '0')} min`;
}

/**
 * Hora de llegada estimada en formato "04:51 p. m.".
 *
 * Se compone a mano (12 horas + meridiano con espacio) en lugar de
 * `toLocaleTimeString`: el ICU del runner puede no traer los datos de `es-MX`
 * y formatearía "p.m." sin espacio, distinto al que ven los usuarios reales.
 */
export function formatArrivalTime(durationSeconds: number, now: Date = new Date()): string {
  const arrival = new Date(now.getTime() + Math.max(durationSeconds, 0) * 1000);
  const rawHour = arrival.getHours();
  const meridiem = rawHour < 12 ? 'a. m.' : 'p. m.';
  const displayHour = rawHour % 12 === 0 ? 12 : rawHour % 12;
  const minutes = arrival.getMinutes().toString().padStart(2, '0');

  return `${displayHour.toString().padStart(2, '0')}:${minutes} ${meridiem}`;
}

/**
 * Línea de la tarjeta inferior: "14 min · 6.63 km · 04:51 p. m.".
 *
 * La distancia se omite cuando OSRM no devolvió métricas (fallback de línea
 * recta), pero duración y hora de llegada siempre muestran un valor.
 */
export function buildEtaLine(
  durationSeconds: number,
  distanceMeters: number,
  now: Date = new Date(),
): string {
  const duration = durationSeconds > 0 ? formatDurationLabel(durationSeconds) : '-- min';
  const distance = distanceMeters > 0 ? formatDistanceLabel(distanceMeters) : null;
  const arrival = formatArrivalTime(Math.max(durationSeconds, 0), now);

  return [duration, distance, arrival].filter((segment) => segment !== null).join(' · ');
}

/**
 * Decide si conviene volver a consultar la ruta tras un movimiento GPS.
 *
 * Consultar OSRM en cada tick de GPS (uno por segundo) martillea el servicio
 * y no cambia la maniobra: solo se re-consulta cuando el origen se desplazó
 * al menos `minDeltaMeters` desde la última consulta.
 */
export function shouldRefetchRoute(
  lastOrigin: [number, number] | null,
  nextOrigin: [number, number],
  minDeltaMeters = 50,
): boolean {
  if (lastOrigin === null) return true;

  const distanceMeters = haversineDistance(
    { x: lastOrigin[1], y: lastOrigin[0] },
    { x: nextOrigin[1], y: nextOrigin[0] },
  ).m;

  return distanceMeters >= minDeltaMeters;
}
