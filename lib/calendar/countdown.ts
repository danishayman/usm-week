import { dateToEpochDayInTimeZone } from "@/lib/calendar/date";
import {
  getCalendarCountdownTarget,
  type CalendarInfo,
} from "@/lib/calendar/engine";
import type { AcademicCalendar } from "@/lib/calendar/types";

export interface DailyCountdown {
  /** SemesterCard's countdownLabel, e.g. "Mid-Semester Break starts in". */
  label: string;
  /** Whole calendar days to go, or null once the calendar is complete. */
  days: number | null;
}

// calendarStart/calendarEnd are date-only values anchored to UTC (calendarEnd
// is 23:59:59.999Z), so they are formatted in UTC. Formatting them in the
// campus zone would push the end date onto the following day.
function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-MY", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The countdown for a once-a-day snapshot, such as the Discord card.
 *
 * Labels and phase handling follow SemesterCard's countdownLabel, but the
 * figure is whole calendar days in the campus zone rather than a ticking
 * hours/minutes/seconds countdown, which would be stale the moment it posts.
 * Counting calendar days (not flooring elapsed time) keeps a card posted at
 * 12:05am from reading one day short.
 */
export function getDailyCountdown(
  calendar: AcademicCalendar,
  info: CalendarInfo,
  now: Date = new Date()
): DailyCountdown {
  const { timezone } = calendar;
  const daysUntil = (target: Date) =>
    Math.max(
      0,
      dateToEpochDayInTimeZone(target, timezone) -
        dateToEpochDayInTimeZone(now, timezone)
    );

  if (info.phase === "pre") {
    return {
      label: `Semester begins on ${formatShortDate(info.calendarStart)}`,
      days: daysUntil(info.calendarStart),
    };
  }
  if (info.phase === "post") {
    return {
      label: `Ended on ${formatShortDate(info.calendarEnd)}`,
      days: null,
    };
  }

  const days = daysUntil(getCalendarCountdownTarget(calendar, info));
  if (info.nextPeriod) {
    return { label: `${info.nextPeriod.label} starts in`, days };
  }
  if (calendar.nextAcademicYearStart) {
    return { label: "Next academic year starts in", days };
  }
  return { label: `${info.currentPeriod.label} ends in`, days };
}
