import { describe, expect, it } from 'vitest';
import type { WeekdayKey } from '../types/database';
import {
  countOpenDays,
  createDefaultWeeklyHours,
  describeDaySchedule,
  getScheduleForDate,
  hasAnyOpenDay,
  isMerchantOpenOnDate,
  isOpenAtMinutes,
  isOpenOnDay,
  isValidTimeString,
  normalizeTimeString,
  normalizeWeeklySchedule,
  parseDaySchedule,
  parseWeeklyHours,
  summarizeWeeklyHours,
  timeToMinutes,
  WEEKDAY_KEYS,
} from './weeklyHours';

/** Lunes 2026-10-05 a las 12:00 hora local. */
function mondayAt(hours: number, minutes: number): Date {
  const date = new Date(2026, 9, 5, hours, minutes);
  return date;
}

/** Domingo 2026-10-11 a las 12:00 hora local. */
function sundayAt(hours: number, minutes: number): Date {
  return new Date(2026, 9, 11, hours, minutes);
}

describe('isValidTimeString', () => {
  it('acepta horas válidas en formato HH:mm', () => {
    expect(isValidTimeString('00:00')).toBe(true);
    expect(isValidTimeString('09:30')).toBe(true);
    expect(isValidTimeString('23:59')).toBe(true);
  });

  it('rechaza horas fuera de rango o con formato incorrecto', () => {
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('12:60')).toBe(false);
    expect(isValidTimeString('9:30')).toBe(false);
    expect(isValidTimeString('0930')).toBe(false);
    expect(isValidTimeString('')).toBe(false);
    expect(isValidTimeString(null)).toBe(false);
    expect(isValidTimeString(930)).toBe(false);
  });

  it('acepta HH:mm:ss, que es como Supabase devuelve las columnas time', () => {
    // merchants.opening_time es de tipo `time`: PostgREST responde "09:00:00".
    expect(isValidTimeString('09:00:00')).toBe(true);
    expect(isValidTimeString('00:00:00')).toBe(true);
  });

  it('rechaza segundos inválidos', () => {
    expect(isValidTimeString('09:00:99')).toBe(false);
  });
});

describe('normalizeTimeString', () => {
  it('normaliza HH:mm:ss a HH:mm', () => {
    expect(normalizeTimeString('09:00:00')).toBe('09:00');
    expect(normalizeTimeString('02:30:45')).toBe('02:30');
  });

  it('deja intacto un HH:mm válido', () => {
    expect(normalizeTimeString('09:00')).toBe('09:00');
  });

  it('devuelve null para valores no válidos', () => {
    expect(normalizeTimeString('hola')).toBeNull();
    expect(normalizeTimeString('25:00:00')).toBeNull();
    expect(normalizeTimeString(null)).toBeNull();
  });
});

describe('timeToMinutes', () => {
  it('convierte HH:mm a minutos desde medianoche', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('devuelve null si la hora no es válida', () => {
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('abc')).toBeNull();
  });
});

describe('parseDaySchedule', () => {
  it('conserva un día completo y válido', () => {
    expect(parseDaySchedule({ is_open: true, open_time: '10:00', close_time: '22:00' })).toEqual({
      is_open: true,
      open_time: '10:00',
      close_time: '22:00',
    });
  });

  it('respeta is_open: false aunque las horas sean válidas', () => {
    expect(parseDaySchedule({ is_open: false, open_time: '10:00', close_time: '22:00' })).toEqual({
      is_open: false,
      open_time: '10:00',
      close_time: '22:00',
    });
  });

  it('mantiene abierto el día cuando is_open viene ausente', () => {
    expect(parseDaySchedule({ open_time: '09:00', close_time: '13:00' }).is_open).toBe(true);
  });

  it('sustituye horas inválidas por el rango por defecto', () => {
    expect(parseDaySchedule({ is_open: true, open_time: '99:99', close_time: 'hola' })).toEqual({
      is_open: true,
      open_time: '08:00',
      close_time: '20:00',
    });
  });

  it('devuelve el día por defecto ante valores que no son objetos', () => {
    expect(parseDaySchedule(null)).toEqual({ is_open: true, open_time: '08:00', close_time: '20:00' });
    expect(parseDaySchedule('lunes')).toEqual({ is_open: true, open_time: '08:00', close_time: '20:00' });
    expect(parseDaySchedule([1, 2])).toEqual({ is_open: true, open_time: '08:00', close_time: '20:00' });
  });

  it('normaliza horas con segundos vindas de una columna time', () => {
    // Sin esta normalización, "09:00:00" se descartaría y el comercio
    // perdería su horario real al activar la agenda semanal.
    expect(parseDaySchedule({ is_open: true, open_time: '09:00:00', close_time: '02:00:00' })).toEqual({
      is_open: true,
      open_time: '09:00',
      close_time: '02:00',
    });
  });
});

describe('parseWeeklyHours', () => {
  it('devuelve los siete días con el rango por defecto ante null', () => {
    const hours = parseWeeklyHours(null);

    expect(Object.keys(hours.schedule)).toHaveLength(7);
    expect(countOpenDays(hours)).toBe(7);
    expect(hours.timezone).toBe('America/Caracas');
    expect(hours.schedule.sunday).toEqual({ is_open: true, open_time: '08:00', close_time: '20:00' });
  });

  it('conserva los días definidos y completa los ausentes', () => {
    const hours = parseWeeklyHours({
      timezone: 'America/Argentina/Buenos_Aires',
      schedule: {
        monday: { is_open: true, open_time: '09:00', close_time: '13:00' },
        sunday: { is_open: false, open_time: '10:00', close_time: '12:00' },
      },
    });

    expect(hours.timezone).toBe('America/Argentina/Buenos_Aires');
    expect(hours.schedule.monday.close_time).toBe('13:00');
    expect(hours.schedule.sunday.is_open).toBe(false);
    // tuesday no venía: se completa con el default, no se descarta.
    expect(hours.schedule.tuesday.open_time).toBe('08:00');
  });

  it('ignora claves de día desconocidas', () => {
    const hours = parseWeeklyHours({
      schedule: { monday: { is_open: true, open_time: '09:00', close_time: '13:00' }, funday: {} },
    });

    expect(Object.keys(hours.schedule).sort()).toEqual([...WEEKDAY_KEYS].sort());
  });

  it('usa la zona horaria por defecto si viene vacía o no es texto', () => {
    expect(parseWeeklyHours({ timezone: '   ' }).timezone).toBe('America/Caracas');
    expect(parseWeeklyHours({ timezone: 42 }).timezone).toBe('America/Caracas');
  });

  it('no lanza con basura en la base de datos', () => {
    expect(() => parseWeeklyHours('no soy json')).not.toThrow();
    expect(() => parseWeeklyHours({ schedule: 'roto' })).not.toThrow();
  });
});

describe('createDefaultWeeklyHours', () => {
  it('abre los siete días con el rango por defecto', () => {
    const hours = createDefaultWeeklyHours();

    expect(hasAnyOpenDay(hours)).toBe(true);
    expect(countOpenDays(hours)).toBe(7);
  });

  it('acepta una zona horaria propia', () => {
    expect(createDefaultWeeklyHours('America/Mexico_City').timezone).toBe('America/Mexico_City');
  });
});

describe('normalizeWeeklySchedule', () => {
  it('descarta horas inválidas del formulario', () => {
    const schedule = normalizeWeeklySchedule({
      monday: { is_open: true, open_time: '8', close_time: '22:00' },
    });

    expect(schedule.monday.open_time).toBe('08:00');
    expect(schedule.monday.close_time).toBe('22:00');
  });

  it('completa los siete días aunque el formulario envíe solo algunos', () => {
    expect(Object.keys(normalizeWeeklySchedule({ friday: { is_open: false } }))).toHaveLength(7);
  });
});

describe('isOpenAtMinutes', () => {
  const schedule = { is_open: true, open_time: '08:00', close_time: '20:00' };

  it('abre dentro del rango', () => {
    expect(isOpenAtMinutes(schedule, 12 * 60)).toBe(true);
    expect(isOpenAtMinutes(schedule, 8 * 60)).toBe(true);
  });

  it('excluye la hora de cierre', () => {
    expect(isOpenAtMinutes(schedule, 20 * 60)).toBe(false);
  });

  it('cierra fuera del rango', () => {
    expect(isOpenAtMinutes(schedule, 7 * 60 + 59)).toBe(false);
    expect(isOpenAtMinutes(schedule, 21 * 60)).toBe(false);
  });

  it('nunca abre un día marcado como cerrado', () => {
    expect(isOpenAtMinutes({ ...schedule, is_open: false }, 12 * 60)).toBe(false);
  });

  it('trata el horario que cruza medianoche como dos tramos', () => {
    const overnight = { is_open: true, open_time: '20:00', close_time: '02:00' };

    expect(isOpenAtMinutes(overnight, 23 * 60)).toBe(true);
    expect(isOpenAtMinutes(overnight, 1 * 60)).toBe(true);
    expect(isOpenAtMinutes(overnight, 20 * 60)).toBe(true);
    expect(isOpenAtMinutes(overnight, 2 * 60)).toBe(false);
    expect(isOpenAtMinutes(overnight, 12 * 60)).toBe(false);
  });

  it('considera cerrado el día cuando apertura y cierre coinciden', () => {
    expect(isOpenAtMinutes({ is_open: true, open_time: '10:00', close_time: '10:00' }, 10 * 60)).toBe(
      false,
    );
  });

  it('no abre con horas inválidas', () => {
    expect(isOpenAtMinutes({ is_open: true, open_time: 'aa', close_time: '20:00' }, 600)).toBe(false);
  });
});

describe('getScheduleForDate', () => {
  const hours = parseWeeklyHours({
    schedule: {
      monday: { is_open: true, open_time: '09:00', close_time: '13:00' },
      sunday: { is_open: false, open_time: '10:00', close_time: '12:00' },
    },
  });

  it('mapea el lunes al horario del lunes', () => {
    expect(getScheduleForDate(hours, mondayAt(12, 0)).close_time).toBe('13:00');
  });

  it('mapea el domingo al horario del domingo', () => {
    expect(getScheduleForDate(hours, sundayAt(12, 0)).is_open).toBe(false);
  });

  it('no confunde lunes con domingo en los extremos de la semana', () => {
    const saturday = new Date(2026, 9, 10, 12, 0);
    expect(getScheduleForDate(hours, saturday).is_open).toBe(true);
  });
});

describe('isMerchantOpenOnDate', () => {
  const hours = parseWeeklyHours({
    schedule: {
      monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      sunday: { is_open: false, open_time: '08:00', close_time: '20:00' },
    },
  });

  it('detecta que está abierto dentro del horario del día', () => {
    expect(isMerchantOpenOnDate(hours, mondayAt(12, 0))).toBe(true);
  });

  it('detecta que está cerrado fuera del horario', () => {
    expect(isMerchantOpenOnDate(hours, mondayAt(21, 0))).toBe(false);
  });

  it('detecta que el día completo está cerrado', () => {
    expect(isMerchantOpenOnDate(hours, sundayAt(12, 0))).toBe(false);
  });
});

describe('isOpenOnDay', () => {
  it('refleja el flag is_open de cada día', () => {
    const hours = parseWeeklyHours({
      schedule: {
        monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        sunday: { is_open: false, open_time: '08:00', close_time: '20:00' },
      },
    });

    const openDays = WEEKDAY_KEYS.filter((key: WeekdayKey) => isOpenOnDay(hours, key));
    expect(openDays).toContain('monday');
    expect(openDays).not.toContain('sunday');
  });
});

describe('describeDaySchedule', () => {
  it('describe un día abierto', () => {
    expect(describeDaySchedule({ is_open: true, open_time: '08:00', close_time: '20:00' })).toBe(
      '08:00 – 20:00',
    );
  });

  it('indica Cerrado para un día cerrado', () => {
    expect(describeDaySchedule({ is_open: false, open_time: '08:00', close_time: '20:00' })).toBe(
      'Cerrado',
    );
  });
});

describe('countOpenDays', () => {
  it('cuenta sólo los días abiertos', () => {
    const hours = parseWeeklyHours({
      schedule: {
        monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        tuesday: { is_open: false, open_time: '08:00', close_time: '20:00' },
        wednesday: { is_open: false, open_time: '08:00', close_time: '20:00' },
      },
    });

    expect(countOpenDays(hours)).toBe(5);
    expect(hasAnyOpenDay(hours)).toBe(true);
  });

  it('detecta una agenda completamente cerrada', () => {
    const hours = parseWeeklyHours({
      schedule: Object.fromEntries(
        WEEKDAY_KEYS.map((key) => [key, { is_open: false, open_time: '08:00', close_time: '20:00' }]),
      ),
    });

    expect(countOpenDays(hours)).toBe(0);
    expect(hasAnyOpenDay(hours)).toBe(false);
  });
});

describe('datos reales de una columna time de Postgres', () => {
  // Reproduce el caso del comercio "Insight" en la base: opening_time/closing_time
  // son de tipo `time` (PostgREST -> "09:00:00") y el horario cruza medianoche.
  const remotePayload = {
    timezone: 'America/Caracas',
    schedule: Object.fromEntries(
      WEEKDAY_KEYS.map((key) => [
        key,
        { is_open: true, open_time: '09:00', close_time: '02:00' },
      ]),
    ),
  };

  it('mantiene el horario real en vez de caer al default', () => {
    const hours = parseWeeklyHours(remotePayload);

    expect(hours.schedule.monday).toEqual({ is_open: true, open_time: '09:00', close_time: '02:00' });
    expect(hours.schedule.sunday.close_time).toBe('02:00');
  });

  it('reconstruye el horario a partir de las columnas time crudas', () => {
    const fromRawColumns = parseWeeklyHours({
      timezone: 'America/Caracas',
      schedule: Object.fromEntries(
        WEEKDAY_KEYS.map((key) => [
          key,
          { is_open: true, open_time: '09:00:00', close_time: '02:00:00' },
        ]),
      ),
    });

    expect(fromRawColumns.schedule.monday).toEqual(remotePayload.schedule.monday);
  });

  it('evalúa correctamente el cruce de medianoche en todos los días', () => {
    const hours = parseWeeklyHours(remotePayload);

    // Lunes 23:00 sigue abierto; martes 01:00 también; martes 03:00 no.
    expect(isMerchantOpenOnDate(hours, mondayAt(23, 0))).toBe(true);
    expect(isMerchantOpenOnDate(hours, new Date(2026, 9, 6, 1, 0))).toBe(true);
    expect(isMerchantOpenOnDate(hours, new Date(2026, 9, 6, 3, 0))).toBe(false);
  });

  it('el resumen conserva el cierre posterior a medianoche', () => {
    expect(summarizeWeeklyHours(parseWeeklyHours(remotePayload))).toEqual({
      opening_time: '09:00',
      closing_time: '02:00',
    });
  });

  it('describe el rango con formato HH:mm, sin segundos', () => {
    expect(describeDaySchedule({ is_open: true, open_time: '09:00', close_time: '02:00' })).toBe(
      '09:00 – 02:00',
    );
  });
});

describe('summarizeWeeklyHours', () => {
  it('resume la agenda al día que abre más temprano y cierra más tarde', () => {
    const hours = parseWeeklyHours({
      schedule: {
        monday: { is_open: true, open_time: '09:00', close_time: '13:00' },
        saturday: { is_open: true, open_time: '08:00', close_time: '23:30' },
        sunday: { is_open: false, open_time: '07:00', close_time: '10:00' },
      },
    });

    expect(summarizeWeeklyHours(hours)).toEqual({
      opening_time: '08:00',
      closing_time: '23:30',
    });
  });

  it('ignora los días cerrados al resumir', () => {
    // Los días no declarados se completan como abiertos 08:00-20:00, así que
    // se cierran explícitamente para que sólo lunes influya en el resumen.
    const closedDay = { is_open: false, open_time: '08:00', close_time: '20:00' };
    const hours = parseWeeklyHours({
      schedule: {
        monday: { is_open: true, open_time: '10:00', close_time: '18:00' },
        tuesday: closedDay,
        wednesday: closedDay,
        thursday: closedDay,
        friday: closedDay,
        saturday: closedDay,
        sunday: { is_open: false, open_time: '00:00', close_time: '23:59' },
      },
    });

    expect(summarizeWeeklyHours(hours)).toEqual({
      opening_time: '10:00',
      closing_time: '18:00',
    });
  });

  it('devuelve null cuando el comercio no abre ningún día', () => {
    const hours = parseWeeklyHours({
      schedule: Object.fromEntries(
        WEEKDAY_KEYS.map((key) => [key, { is_open: false, open_time: '08:00', close_time: '20:00' }]),
      ),
    });

    expect(summarizeWeeklyHours(hours)).toEqual({ opening_time: null, closing_time: null });
  });
});