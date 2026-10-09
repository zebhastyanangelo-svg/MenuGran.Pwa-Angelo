export type CompletedPeriod = 'today' | 'week' | 'month';

export interface CompletedPeriodRange {
  start: Date;
  end: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  return new Date(start.getTime() - daysSinceMonday * MS_PER_DAY);
}

export function getCompletedPeriodRange(
  period: CompletedPeriod,
  offset: number,
  now: Date,
): CompletedPeriodRange {
  switch (period) {
    case 'today': {
      const start = startOfDay(now);
      return { start, end: new Date(start.getTime() + MS_PER_DAY) };
    }
    case 'week': {
      const start = new Date(startOfWeek(now).getTime() - offset * MS_PER_WEEK);
      return { start, end: new Date(start.getTime() + MS_PER_WEEK) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      return { start, end };
    }
  }
}

export function filterDeliveredOrdersByPeriod<T extends { created_at: string }>(
  orders: readonly T[],
  period: CompletedPeriod,
  offset: number,
  now: Date,
): T[] {
  const { start, end } = getCompletedPeriodRange(period, offset, now);
  return orders.filter((order) => {
    const createdAt = new Date(order.created_at);
    return createdAt >= start && createdAt < end;
  });
}

export function formatCompletedPeriodLabel(
  period: CompletedPeriod,
  offset: number,
  now: Date,
): string {
  if (period === 'today') return 'Hoy';

  if (period === 'week') {
    const { start, end } = getCompletedPeriodRange(period, offset, now);
    const lastDay = new Date(end.getTime() - MS_PER_DAY);
    const startLabel = start.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    const endLabel = lastDay.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    return offset === 0
      ? `Esta semana (${startLabel} - ${endLabel})`
      : `Semana del ${startLabel} al ${endLabel}`;
  }

  const { start } = getCompletedPeriodRange(period, offset, now);
  const monthLabel = start.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
}
