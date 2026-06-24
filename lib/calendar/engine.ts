import {
  MS_PER_DAY,
  dateToEpochDayInTimeZone,
  formatIsoDateFromEpochDay,
  inclusiveDaysBetween,
  isoDateToEpochDay,
  isoDateToTimeZoneStart,
  isoDateToUtcEnd,
  isoDateToUtcStart,
} from "@/lib/calendar/date";
import type {
  AcademicCalendar,
  CalendarPeriod,
  CalendarPhase,
} from "@/lib/calendar/types";

export interface CalendarInfo {
  phase: CalendarPhase;
  currentPeriod: CalendarPeriod;
  periodStart: Date;
  periodEnd: Date;
  nextPeriod: CalendarPeriod | null;
  nextPeriodStart: Date | null;
  calendarStart: Date;
  calendarEnd: Date;
  progressPercent: number;
  currentWeek: number | null;
  totalWeeks: number;
  termLabel: string;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const PROGRESS_TARGET_WEEK = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getTrackedWeekSpan(period: CalendarPeriod): number {
  return Math.ceil(inclusiveDaysBetween(period.startDate, period.endDate) / 7);
}

function getCurrentTermPeriods(
  periods: CalendarPeriod[],
  termId: string
): CalendarPeriod[] {
  return periods.filter((period) => period.termId === termId);
}

function getProgressEndDay(termPeriods: CalendarPeriod[]): number {
  let progressEndDay = isoDateToEpochDay(termPeriods[termPeriods.length - 1].endDate);

  for (const period of termPeriods) {
    if (!period.countsTowardProgress || period.weekStart === undefined) continue;

    const durationInWeeks = getTrackedWeekSpan(period);
    const lastWeek = period.weekStart + durationInWeeks - 1;

    if (period.weekStart <= PROGRESS_TARGET_WEEK && lastWeek >= PROGRESS_TARGET_WEEK) {
      const weeksNeeded = PROGRESS_TARGET_WEEK - period.weekStart + 1;
      const targetWeekEndDay = isoDateToEpochDay(period.startDate) + weeksNeeded * 7 - 1;
      progressEndDay = Math.min(targetWeekEndDay, isoDateToEpochDay(period.endDate));
      break;
    }
  }

  return progressEndDay;
}

function getTotalWeeks(termPeriods: CalendarPeriod[]): number {
  return termPeriods.reduce((acc, period) => {
    if (
      period.weekStart === undefined ||
      (period.type !== "teaching" && period.type !== "revision")
    ) {
      return acc;
    }

    return acc + getTrackedWeekSpan(period);
  }, 0);
}

export function getCalendarInfo(
  calendar: AcademicCalendar,
  now: Date = new Date()
): CalendarInfo {
  const periods = calendar.periods;
  const termsById = new Map(calendar.terms.map((term) => [term.id, term]));

  const firstPeriod = periods[0];
  const lastPeriod = periods[periods.length - 1];
  const calendarStartDay = isoDateToEpochDay(firstPeriod.startDate);
  const calendarEndDay = isoDateToEpochDay(lastPeriod.endDate);
  const todayDay = dateToEpochDayInTimeZone(now, calendar.timezone);

  let matched: CalendarPeriod = firstPeriod;
  if (todayDay < calendarStartDay) {
    matched = firstPeriod;
  } else if (todayDay > calendarEndDay) {
    matched = lastPeriod;
  } else {
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const periodStartDay = isoDateToEpochDay(period.startDate);
      const periodEndDay = isoDateToEpochDay(period.endDate);

      if (todayDay >= periodStartDay && todayDay <= periodEndDay) {
        matched = period;
        break;
      }

      if (i < periods.length - 1) {
        const nextStartDay = isoDateToEpochDay(periods[i + 1].startDate);
        if (todayDay > periodEndDay && todayDay < nextStartDay) {
          matched = periods[i + 1];
          break;
        }
      }
    }
  }

  const phase: CalendarPhase =
    todayDay < calendarStartDay ? "pre" : todayDay > calendarEndDay ? "post" : "active";

  const matchedIndex = periods.findIndex((period) => period.id === matched.id);
  const nextPeriod =
    matchedIndex >= 0 && matchedIndex < periods.length - 1 ? periods[matchedIndex + 1] : null;
  const nextPeriodStart = nextPeriod
    ? isoDateToTimeZoneStart(nextPeriod.startDate, calendar.timezone)
    : null;

  let currentWeek: number | null = null;
  if (phase === "active" && matched.weekStart !== undefined) {
    const periodStartDay = isoDateToEpochDay(matched.startDate);
    const weeksIn = Math.floor((todayDay - periodStartDay) / 7);
    const lastTrackedWeek = matched.weekStart + getTrackedWeekSpan(matched) - 1;
    currentWeek = Math.min(matched.weekStart + weeksIn, lastTrackedWeek);
  }

  const term = termsById.get(matched.termId);
  const termPeriods = getCurrentTermPeriods(periods, matched.termId);
  const progressStartDay = isoDateToEpochDay(termPeriods[0].startDate);
  const progressEndDay = getProgressEndDay(termPeriods);
  const progressStartMs = isoDateToTimeZoneStart(
    termPeriods[0].startDate,
    calendar.timezone
  ).getTime();
  const progressEndExclusiveMs = isoDateToTimeZoneStart(
    formatIsoDateFromEpochDay(progressEndDay + 1),
    calendar.timezone
  ).getTime();
  const totalProgressMs = Math.max(1, progressEndExclusiveMs - progressStartMs);
  const elapsedProgressMs = clamp(
    now.getTime() - progressStartMs,
    0,
    totalProgressMs
  );
  const progressPercent = clamp(
    (elapsedProgressMs / totalProgressMs) * 100,
    0,
    100
  );

  return {
    phase,
    currentPeriod: matched,
    periodStart: isoDateToUtcStart(matched.startDate),
    periodEnd: isoDateToUtcEnd(matched.endDate),
    nextPeriod,
    nextPeriodStart,
    calendarStart: isoDateToUtcStart(firstPeriod.startDate),
    calendarEnd: isoDateToUtcEnd(lastPeriod.endDate),
    progressPercent,
    currentWeek,
    totalWeeks: getTotalWeeks(termPeriods),
    termLabel: term?.label ?? calendar.academicYear,
  };
}

export function getCalendarCountdownTarget(
  calendar: AcademicCalendar,
  info: CalendarInfo
): Date {
  if (info.nextPeriodStart) return info.nextPeriodStart;
  if (calendar.nextAcademicYearStart) {
    return isoDateToTimeZoneStart(calendar.nextAcademicYearStart, calendar.timezone);
  }

  return info.periodEnd;
}

export function getCountdown(
  target: Date,
  now: Date = new Date()
): CountdownParts {
  const total = Math.max(0, target.getTime() - now.getTime());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / MS_PER_DAY);
  return { days, hours, minutes, seconds, total };
}
