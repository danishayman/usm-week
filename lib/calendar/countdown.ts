import { dateToEpochDayInTimeZone } from "@/lib/calendar/date";
import {
  getCalendarCountdownTarget,
  type CalendarInfo,
} from "@/lib/calendar/engine";
import type { AcademicCalendar } from "@/lib/calendar/types";

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

function formatDays(days: number): string {
  if (days <= 0) return "today";
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

/**
 * The countdown line for a once-a-day snapshot, such as the Discord card.
 *
 * Wording and phase handling follow SemesterCard's countdownLabel, but the
 * figure is whole calendar days in the campus zone rather than a ticking
 * hours/minutes/seconds countdown, which would be stale the moment it posts.
 * Counting calendar days (not flooring elapsed time) keeps a card posted at
 * 12:05am from reading one day short.
 */
export function getDailyCountdownLine(
  calendar: AcademicCalendar,
  info: CalendarInfo,
  now: Date = new Date()
): string {
  const { timezone } = calendar;

  if (info.phase === "pre") {
    return `Semester begins on ${formatShortDate(info.calendarStart)}`;
  }
  if (info.phase === "post") {
    return `Ended on ${formatShortDate(info.calendarEnd)}`;
  }

  const target = getCalendarCountdownTarget(calendar, info);
  const days =
    dateToEpochDayInTimeZone(target, timezone) -
    dateToEpochDayInTimeZone(now, timezone);
  const when = formatDays(days);

  if (info.nextPeriod) return `${info.nextPeriod.label} starts ${when}`;
  if (calendar.nextAcademicYearStart) return `Next academic year starts ${when}`;
  return `${info.currentPeriod.label} ends ${when}`;
}
