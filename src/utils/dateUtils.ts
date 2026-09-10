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
