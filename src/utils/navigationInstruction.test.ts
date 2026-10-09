import { describe, expect, it } from 'vitest';
import {
  buildEtaLine,
  buildNavigationInstruction,
  formatArrivalTime,
  formatDistanceLabel,
  formatDurationLabel,
  shouldRefetchRoute,
} from './navigationInstruction';
import type { OsrmRouteStep } from './osrmRoute';

function step(overrides: Partial<OsrmRouteStep> = {}): OsrmRouteStep {
  return {
    maneuver: { type: 'turn', modifier: 'right' },
    name: 'Calle 8',
    distanceMeters: 290,
    ...overrides,
  };
}

describe('buildNavigationInstruction', () => {
  it('construye la instrucción de giro a la derecha con distancia', () => {
    const instruction = buildNavigationInstruction(step());

    expect(instruction.text).toBe('Gira a la derecha');
    expect(instruction.icon).toBe('turn-right');
    expect(instruction.distanceLabel).toBe('290 m');
    expect(instruction.streetName).toBe('Calle 8');
  });

  it('construye la instrucción de giro a la izquierda', () => {
    const instruction = buildNavigationInstruction(
      step({ maneuver: { type: 'turn', modifier: 'left' } }),
    );

    expect(instruction.text).toBe('Gira a la izquierda');
    expect(instruction.icon).toBe('turn-left');
  });

  it('marca la llegada al destino', () => {
    const instruction = buildNavigationInstruction(
      step({ maneuver: { type: 'arrive' }, distanceMeters: 0, name: '' }),
    );

    expect(instruction.text).toBe('Llegaste a tu destino');
    expect(instruction.icon).toBe('arrive');
    expect(instruction.distanceLabel).toBe('');
  });
  it('usa la flecha recta para salir y continuar sin modificador', () => {
    const depart = buildNavigationInstruction(step({ maneuver: { type: 'depart' } }));
    const continuation = buildNavigationInstruction(step({ maneuver: { type: 'continue' } }));

    expect(depart.icon).toBe('straight');
    expect(depart.text).toBe('Sigue derecho');
    expect(continuation.text).toBe('Continúa');
  });

  it('describe las redondeles, incorporaciones y salidas', () => {
    const roundabout = buildNavigationInstruction(step({ maneuver: { type: 'roundabout' } }));
    const merge = buildNavigationInstruction(step({ maneuver: { type: 'merge' } }));
    const ramp = buildNavigationInstruction(step({ maneuver: { type: 'off ramp' } }));

    expect(roundabout.text).toBe('Entra a la redondel');
    expect(roundabout.icon).toBe('roundabout');
    expect(merge.text).toBe('Incorpórate');
    expect(ramp.text).toBe('Toma la salida a la derecha');
  });

  it('cae a "Sigue derecho" con maniobras desconocidas', () => {
    const instruction = buildNavigationInstruction(
      step({ maneuver: { type: 'desconocido' as unknown as string } }),
    );

    expect(instruction.text).toBe('Sigue derecho');
    expect(instruction.icon).toBe('straight');
  });

  it('maneja maniobras pronunciadas y vueltas en U', () => {
    const sharp = buildNavigationInstruction(
      step({ maneuver: { type: 'turn', modifier: 'sharp left' } }),
    );
    const uturn = buildNavigationInstruction(
      step({ maneuver: { type: 'end of road', modifier: 'uturn' } }),
    );

    expect(sharp.text).toBe('Gira pronunciadamente a la izquierda');
    expect(uturn.text).toBe('Da la vuelta en U');
  });
});

describe('formatDistanceLabel', () => {
  it('formatea metros bajo un kilómetro', () => {
    expect(formatDistanceLabel(290)).toBe('290 m');
    expect(formatDistanceLabel(12.4)).toBe('12 m');
  });

  it('formatea kilómetros con dos decimales', () => {
    expect(formatDistanceLabel(6632)).toBe('6.63 km');
  });

  it('devuelve vacío con distancias nulas o inválidas', () => {
    expect(formatDistanceLabel(0)).toBe('');
    expect(formatDistanceLabel(Number.NaN)).toBe('');
    expect(formatDistanceLabel(-5)).toBe('');
  });
});

describe('formatDurationLabel', () => {
  it('formatea minutos bajo una hora', () => {
    expect(formatDurationLabel(840)).toBe('14 min');
  });

  it('formatea horas con minutos restantes', () => {
    expect(formatDurationLabel(3900)).toBe('1 h 05 min');
  });

  it('devuelve placeholder sin duración', () => {
    expect(formatDurationLabel(0)).toBe('-- min');
  });
});

describe('formatArrivalTime', () => {
  it('suman la duración a la hora actual', () => {
    const now = new Date(2026, 0, 15, 16, 0, 0);
    expect(formatArrivalTime(51 * 60, now)).toBe('04:51 p. m.');
  });
});

describe('buildEtaLine', () => {
  it('compone duración, distancia y hora de llegada', () => {
    const now = new Date(2026, 0, 15, 16, 0, 0);
    expect(buildEtaLine(840, 6632, now)).toBe('14 min · 6.63 km · 04:14 p. m.');
  });

  it('omite la distancia cuando no hay métricas de ruta', () => {
    const now = new Date(2026, 0, 15, 16, 0, 0);
    expect(buildEtaLine(0, 0, now)).toMatch(/^-- min · /);
  });
});

describe('shouldRefetchRoute', () => {
  it('consulta la ruta la primera vez, sin origen previo', () => {
    expect(shouldRefetchRoute(null, [10.5, -66.9])).toBe(true);
  });

  it('no re-consulta mientras el movimiento sea menor al umbral', () => {
    const origin: [number, number] = [10.5, -66.9];
    const smallMove: [number, number] = [10.5001, -66.9001];

    expect(shouldRefetchRoute(origin, smallMove)).toBe(false);
  });

  it('re-consulta cuando el origen se desplazó lo suficiente', () => {
    const origin: [number, number] = [10.5, -66.9];
    const bigMove: [number, number] = [10.51, -66.91];

    expect(shouldRefetchRoute(origin, bigMove)).toBe(true);
  });

  it('respeta umbrales personalizados', () => {
    const origin: [number, number] = [10.5, -66.9];
    const move: [number, number] = [10.5005, -66.9005];

    expect(shouldRefetchRoute(origin, move, 10)).toBe(true);
    expect(shouldRefetchRoute(origin, move, 500)).toBe(false);
  });
});
