function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDefaultDateRange(): { startDate: string; endDate: string } {
  return {
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
  };
}

/**
 * Devuelve true si la hora actual (local) está entre opening y closing.
 * opening y closing en formato "HH:mm" (24h). Si opening > closing se asume que cruza medianoche.
 */
export function isMerchantOpenNow(opening: string | null | undefined, closing: string | null | undefined): boolean {
  if (!opening || !closing) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const openMin = parse(opening);
  const closeMin = parse(closing);

  if (openMin <= closeMin) {
    return currentMinutes >= openMin && currentMinutes < closeMin;
  }
  // cruza medianoche
  return currentMinutes >= openMin || currentMinutes < closeMin;
}
