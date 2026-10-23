import type { CalendarInfo } from "@/lib/calendar/engine";
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

/**
 * The line above the countdown, e.g. "Mid-Semester Break starts in". Shared by
 * the page and the Discord card so their wording cannot drift apart. Before
 * and after the calendar it states a date instead.
 */
export function getCountdownLabel(
  calendar: AcademicCalendar,
  info: CalendarInfo
): string {
  if (info.phase === "pre") {
    return `Semester begins on ${formatShortDate(info.calendarStart)}`;
  }
  if (info.phase === "post") {
    return `Ended on ${formatShortDate(info.calendarEnd)}`;
  }
  if (info.nextPeriod) return `${info.nextPeriod.label} starts in`;
  if (calendar.nextAcademicYearStart) return "Next academic year starts in";
  return `${info.currentPeriod.label} ends in`;
}
