export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function timeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Date must use YYYY-MM-DD.");
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export type GeneratedAcademicWeek = {
  sequenceNumber: number;
  startsOn: string;
  endsOn: string;
  deadlineDate: string;
};

export function generateAcademicWeekDates(input: {
  startDate: string;
  endDate: string;
  deadlineWeekday: number;
}): GeneratedAcademicWeek[] {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  if (end < start) throw new Error("End date must not precede start date.");
  if (
    !Number.isInteger(input.deadlineWeekday) ||
    input.deadlineWeekday < 0 ||
    input.deadlineWeekday > 6
  ) {
    throw new Error("Deadline weekday must be between 0 and 6.");
  }

  const weeks: GeneratedAcademicWeek[] = [];
  let weekStart = start;
  while (weekStart <= end) {
    const candidateEnd = addUtcDays(weekStart, 6);
    const weekEnd = candidateEnd < end ? candidateEnd : end;
    const offset = (input.deadlineWeekday - weekStart.getUTCDay() + 7) % 7;
    const candidateDeadline = addUtcDays(weekStart, offset);
    const deadline = candidateDeadline < weekEnd ? candidateDeadline : weekEnd;
    weeks.push({
      sequenceNumber: weeks.length + 1,
      startsOn: formatUtcDate(weekStart),
      endsOn: formatUtcDate(weekEnd),
      deadlineDate: formatUtcDate(deadline),
    });
    weekStart = addUtcDays(weekStart, 7);
  }
  return weeks;
}
