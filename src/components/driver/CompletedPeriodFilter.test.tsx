import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletedPeriodFilter } from './CompletedPeriodFilter';

describe('CompletedPeriodFilter', () => {
  it('muestra los botones Hoy, Semana y Mes con Hoy activo por defecto', () => {
    render(
      <CompletedPeriodFilter
        period="today"
        offset={0}
        onPeriodChange={vi.fn()}
        onOffsetChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('completed-period-today')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('completed-period-week')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('completed-period-month')).toHaveAttribute('aria-pressed', 'false');
  });

  it('con período hoy no muestra navegación entre períodos', () => {
    render(
      <CompletedPeriodFilter
        period="today"
        offset={0}
        onPeriodChange={vi.fn()}
        onOffsetChange={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('completed-period-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('completed-period-next')).not.toBeInTheDocument();
  });

  it('al pulsar Semana notifica el cambio de período', () => {
    const onPeriodChange = vi.fn();
    render(
      <CompletedPeriodFilter
        period="today"
        offset={0}
        onPeriodChange={onPeriodChange}
        onOffsetChange={vi.fn()}
      />,
    );

    screen.getByTestId('completed-period-week').click();

    expect(onPeriodChange).toHaveBeenCalledWith('week');
  });

  it('con período semana muestra la etiqueta del rango y la navegación', () => {
    render(
      <CompletedPeriodFilter
        period="week"
        offset={0}
        onPeriodChange={vi.fn()}
        onOffsetChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('completed-period-label').textContent).toMatch(
      /Esta semana|Semana del/,
    );
    expect(screen.getByTestId('completed-period-prev')).toBeInTheDocument();
    expect(screen.getByTestId('completed-period-next')).toBeInTheDocument();
  });

  it('el botón siguiente está deshabilitado en el período actual (offset 0)', () => {
    render(
      <CompletedPeriodFilter
        period="month"
        offset={0}
        onPeriodChange={vi.fn()}
        onOffsetChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('completed-period-next')).toBeDisabled();
    expect(screen.getByTestId('completed-period-prev')).not.toBeDisabled();
  });

  it('con offset mayor que 0 permite volver al período más reciente', () => {
    const onOffsetChange = vi.fn();
    render(
      <CompletedPeriodFilter
        period="month"
        offset={2}
        onPeriodChange={vi.fn()}
        onOffsetChange={onOffsetChange}
      />,
    );

    screen.getByTestId('completed-period-prev').click();
    expect(onOffsetChange).toHaveBeenLastCalledWith(3);

    screen.getByTestId('completed-period-next').click();
    expect(onOffsetChange).toHaveBeenLastCalledWith(1);
  });
});
