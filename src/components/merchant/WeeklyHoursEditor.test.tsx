import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DaySchedule, WeeklyHours, WeeklySchedule } from '../../types/database';
import { WEEKDAY_KEYS } from '../../utils/weeklyHours';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';

function buildHours(overrides: Partial<WeeklyHours> = {}): WeeklyHours {
  const schedule = Object.fromEntries(
    WEEKDAY_KEYS.map(
      (key) => [key, { is_open: true, open_time: '08:00', close_time: '20:00' }] as const,
    ),
  ) as unknown as WeeklySchedule;

  return { timezone: 'America/Caracas', schedule, ...overrides };
}

function renderEditor(hours: WeeklyHours = buildHours()) {
  const onChange = vi.fn();
  render(<WeeklyHoursEditor weeklyHours={hours} onChange={onChange} />);
  return { onChange };
}

describe('WeeklyHoursEditor', () => {
  it('renderiza los siete días con su etiqueta', () => {
    renderEditor();

    for (const label of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('muestra el rango de cada día abierto', () => {
    renderEditor();

    // Los siete días comparten el mismo rango en el fixture.
    expect(screen.getAllByText('08:00 – 20:00')).toHaveLength(7);
  });

  it('marca Cerrado en los días no abiertos y oculta sus horas', () => {
    const hours = buildHours();
    hours.schedule.sunday = { is_open: false, open_time: '10:00', close_time: '12:00' };
    renderEditor(hours);

    expect(screen.getByLabelText('Domingo abierto')).not.toBeChecked();
    expect(screen.getByText('Cerrado')).toBeInTheDocument();
    expect(screen.queryByLabelText('Apertura', { selector: '#weekly-hours-sunday-open' })).toBeNull();
  });

  it('emite el cambio al alternar un día', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByLabelText('Domingo abierto'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next.schedule.sunday.is_open).toBe(false);
    // Los demás días no deben cambiar.
    expect(next.schedule.monday.is_open).toBe(true);
  });

  it('emite el cambio al editar la hora de apertura', () => {
    const { onChange } = renderEditor();

    // `userEvent.type` no es fiable con <input type="time"> en jsdom, por lo que
    // se dispara el change con el valor final directamente.
    fireEvent.change(screen.getByLabelText('Apertura', { selector: '#weekly-hours-monday-open' }), {
      target: { value: '10:00' },
    });

    const next = onChange.mock.calls.at(-1)?.[0];
    expect(next.schedule.monday.open_time).toBe('10:00');
    expect(next.schedule.monday.close_time).toBe('20:00');
  });

  it('abre todos los días con el botón masivo', async () => {
    const user = userEvent.setup();
    const hours = buildHours();
    for (const key of WEEKDAY_KEYS) {
      hours.schedule[key] = { is_open: false, open_time: '08:00', close_time: '20:00' };
    }

    const { onChange } = renderEditor(hours);
    await user.click(screen.getByRole('button', { name: /Abrir todos los días/i }));

    const next = onChange.mock.calls[0][0] as WeeklyHours;
    expect(Object.values(next.schedule).every((day: DaySchedule) => day.is_open)).toBe(true);
  });

  it('cierra todos los días con el botón masivo', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByRole('button', { name: /Cerrar todos los días/i }));

    const next = onChange.mock.calls[0][0] as WeeklyHours;
    expect(Object.values(next.schedule).every((day: DaySchedule) => !day.is_open)).toBe(true);
  });

  it('avisa cuando el horario cruza la medianoche', () => {
    const hours = buildHours();
    hours.schedule.friday = { is_open: true, open_time: '20:00', close_time: '02:00' };
    renderEditor(hours);

    expect(screen.getByRole('note')).toHaveTextContent(/abierto desde las 20:00 hasta las 02:00/i);
  });

  it('no muestra aviso de medianoche cuando el cierre es posterior a la apertura', () => {
    renderEditor();

    expect(screen.queryByRole('note')).toBeNull();
  });

  it('no muestra aviso en un día cerrado', () => {
    const hours = buildHours();
    hours.schedule.friday = { is_open: false, open_time: '20:00', close_time: '02:00' };
    renderEditor(hours);

    expect(screen.queryByRole('note')).toBeNull();
  });
});