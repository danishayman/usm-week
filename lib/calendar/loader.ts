import rawUsm20252026 from "@/data/calendars/usm-2025-2026.json";
import rawUsm20262027 from "@/data/calendars/usm-2026-2027.json";
import {
  dateToEpochDayInTimeZone,
  isoDateToEpochDay,
} from "@/lib/calendar/date";
import type { AcademicCalendar } from "@/lib/calendar/types";
import { validateCalendar } from "@/lib/calendar/validation";

// Register a new academic year here and the app picks it up on its own once
// that year's first day arrives. No other file needs to change.
const CALENDAR_REGISTRY: Record<string, unknown> = {
  "2025-2026": rawUsm20252026,
  "2026-2027": rawUsm20262027,
};

const validatedCache = new Map<string, AcademicCalendar>();

export function listAvailableAcademicYears(): string[] {
  return Object.keys(CALENDAR_REGISTRY);
}

export function loadCalendar(academicYear: string): AcademicCalendar {
  const cached = validatedCache.get(academicYear);
  if (cached) return cached;

  const rawCalendar = CALENDAR_REGISTRY[academicYear];
  if (!rawCalendar) {
    throw new Error(
      `Calendar "${academicYear}" not found. Available: ${listAvailableAcademicYears().join(
        ", "
      )}`
    );
  }

  const validated = validateCalendar(rawCalendar);
  validatedCache.set(academicYear, validated);
  return validated;
}

function getCalendarStartDay(calendar: AcademicCalendar): number {
  return isoDateToEpochDay(calendar.periods[0].startDate);
}

function getCalendarEndDay(calendar: AcademicCalendar): number {
  return isoDateToEpochDay(
    calendar.periods[calendar.periods.length - 1].endDate
  );
}

// Validate every bundled calendar at import time so builds/dev fail fast,
// and keep them ordered so date lookups can stop at the first future year.
const CALENDARS_BY_START: AcademicCalendar[] = listAvailableAcademicYears()
  .map(loadCalendar)
  .sort((a, b) => getCalendarStartDay(a) - getCalendarStartDay(b));

/**
 * Picks the registered calendar that covers `now`.
 *
 * Between two academic years — registration and orientation, say — the year
 * that just ended is kept, so the app keeps showing a finished session rather
 * than jumping ahead to one that has not begun. Before the earliest calendar
 * the earliest is used, and after the latest one the latest is kept, which
 * leaves the engine to report the "pre" and "post" phases as it always has.
 */
export function getCalendarForDate(now: Date = new Date()): AcademicCalendar {
  let selected = CALENDARS_BY_START[0];

  for (const calendar of CALENDARS_BY_START) {
    const todayDay = dateToEpochDayInTimeZone(now, calendar.timezone);
    if (todayDay < getCalendarStartDay(calendar)) break;

    selected = calendar;
    if (todayDay <= getCalendarEndDay(calendar)) break;
  }

  return selected;
}

export function getDefaultCalendar(now: Date = new Date()): AcademicCalendar {
  return getCalendarForDate(now);
}
