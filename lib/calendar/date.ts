const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const MS_PER_DAY =
  MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseIsoDateParts(isoDate: string): DateParts | null {
  if (!ISO_DATE_REGEX.test(isoDate)) return null;

  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const maybeDate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(maybeDate.getTime()) ||
    maybeDate.getUTCFullYear() !== year ||
    maybeDate.getUTCMonth() + 1 !== month ||
    maybeDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isIsoDateString(isoDate: string): boolean {
  return parseIsoDateParts(isoDate) !== null;
}

export function isoDateToUtcStartMs(isoDate: string): number {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
}

export function isoDateToUtcEndMs(isoDate: string): number {
  return isoDateToUtcStartMs(isoDate) + MS_PER_DAY - 1;
}

export function isoDateToUtcStart(isoDate: string): Date {
  return new Date(isoDateToUtcStartMs(isoDate));
}

export function isoDateToUtcEnd(isoDate: string): Date {
  return new Date(isoDateToUtcEndMs(isoDate));
}

function getTimeZoneOffsetMs(atUtcMs: number, timeZone: string): number {
  const atDate = new Date(atUtcMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(atDate);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>;

  const asUtcMs = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtcMs - atUtcMs;
}

export function isoDateToTimeZoneStart(isoDate: string, timeZone: string): Date {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const utcMidnightMs = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  let candidateMs = utcMidnightMs;

  // Iterate to stabilize around timezone transitions (for example DST offsets).
  for (let i = 0; i < 3; i++) {
    const offsetMs = getTimeZoneOffsetMs(candidateMs, timeZone);
    const correctedMs = utcMidnightMs - offsetMs;
    if (correctedMs === candidateMs) break;
    candidateMs = correctedMs;
  }

  return new Date(candidateMs);
}

export function isoDateToEpochDay(isoDate: string): number {
  return Math.floor(isoDateToUtcStartMs(isoDate) / MS_PER_DAY);
}

export function epochDayToUtcStartMs(epochDay: number): number {
  return epochDay * MS_PER_DAY;
}

export function epochDayToUtcDate(epochDay: number): Date {
  return new Date(epochDayToUtcStartMs(epochDay));
}

export function getIsoDateInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dateToEpochDayInTimeZone(now: Date, timeZone: string): number {
  const zonedIsoDate = getIsoDateInTimeZone(now, timeZone);
  return isoDateToEpochDay(zonedIsoDate);
}

export function formatIsoDateFromEpochDay(epochDay: number): string {
  const asDate = epochDayToUtcDate(epochDay);
  const year = asDate.getUTCFullYear();
  const month = asDate.getUTCMonth() + 1;
  const day = asDate.getUTCDate();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  return formatIsoDateFromEpochDay(isoDateToEpochDay(isoDate) + days);
}

export function inclusiveDaysBetween(startIsoDate: string, endIsoDate: string): number {
  return isoDateToEpochDay(endIsoDate) - isoDateToEpochDay(startIsoDate) + 1;
}
