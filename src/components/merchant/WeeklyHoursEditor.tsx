/**
 * Editor del horario de atención semanal.
 *
 * Un renglón por día con un interruptor "Abierto" y, cuando el día abre, los
 * campos de apertura y cierre. Si el cierre es anterior a la apertura se
 * muestra un aviso: el horario cruza la medianoche, que es un caso válido.
 */

import { CalendarClock } from 'lucide-react';
import type { DaySchedule, WeeklyHours } from '../../types/database';
import {
  describeDaySchedule,
  isValidTimeString,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
} from '../../utils/weeklyHours';

export interface WeeklyHoursEditorProps {
  weeklyHours: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
  disabled?: boolean;
}

/** ¿El cierre es anterior a la apertura? Horario que cruza la medianoche. */
function crossesMidnight(day: DaySchedule): boolean {
  if (!day.is_open) return false;
  return isValidTimeString(day.open_time) && isValidTimeString(day.close_time) && day.close_time < day.open_time;
}

export function WeeklyHoursEditor({
  weeklyHours,
  onChange,
  disabled = false,
}: WeeklyHoursEditorProps) {
  const updateDay = (dayKey: (typeof WEEKDAY_KEYS)[number], patch: Partial<DaySchedule>): void => {
    onChange({
      ...weeklyHours,
      schedule: {
        ...weeklyHours.schedule,
        [dayKey]: { ...weeklyHours.schedule[dayKey], ...patch },
      },
    });
  };

  const applyToAllDays = (patch: Partial<DaySchedule>): void => {
    const nextSchedule = { ...weeklyHours.schedule };
    for (const dayKey of WEEKDAY_KEYS) {
      nextSchedule[dayKey] = { ...nextSchedule[dayKey], ...patch };
    }
    onChange({ ...weeklyHours, schedule: nextSchedule });
  };

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <CalendarClock className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        Horario de atención semanal
      </legend>

      <p className="text-xs text-gray-500">
        Marca los días que el comercio abre. Si el cierre es anterior a la apertura, el
        local permanece abierto después de la medianoche.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyToAllDays({ is_open: true })}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Abrir todos los días
        </button>
        <button
          type="button"
          onClick={() => applyToAllDays({ is_open: false })}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Cerrar todos los días
        </button>
      </div>

      <ul className="space-y-2">
        {WEEKDAY_KEYS.map((dayKey) => {
          const day = weeklyHours.schedule[dayKey];
          const dayFieldId = `weekly-hours-${dayKey}`;

          return (
            <li
              key={dayKey}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={dayFieldId}
                  className="text-sm font-medium text-gray-800"
                >
                  {WEEKDAY_LABELS[dayKey]}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {describeDaySchedule(day)}
                  </span>
                  <input
                    id={dayFieldId}
                    type="checkbox"
                    checked={day.is_open}
                    onChange={(event) => updateDay(dayKey, { is_open: event.target.checked })}
                    aria-label={`${WEEKDAY_LABELS[dayKey]} abierto`}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {day.is_open && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`${dayFieldId}-open`}
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Apertura
                    </label>
                    <input
                      id={`${dayFieldId}-open`}
                      type="time"
                      value={day.open_time}
                      onChange={(event) => updateDay(dayKey, { open_time: event.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${dayFieldId}-close`}
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Cierre
                    </label>
                    <input
                      id={`${dayFieldId}-close`}
                      type="time"
                      value={day.close_time}
                      onChange={(event) => updateDay(dayKey, { close_time: event.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {crossesMidnight(day) && (
                    <p
                      className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700 sm:col-span-2"
                      role="note"
                    >
                      Horario continuo: abierto desde las {day.open_time} hasta las {day.close_time} del
                      día siguiente.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}