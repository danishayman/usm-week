import type { CalendarInfo } from "@/lib/calendar/engine";

export function getWeekBadge(info: CalendarInfo): string | null {
  if (info.currentWeek === null) return null;
  return `Week ${info.currentWeek}`;
}

/**
 * The card's large headline. Periods outside the numbered teaching weeks --
 * Semester II's exams and long break, and either end of the calendar -- carry
 * no week number, so the headline states the current status instead of leaving
 * the slot empty.
 */
export function getHeadline(info: CalendarInfo): string {
  const weekBadge = getWeekBadge(info);
  if (weekBadge) return weekBadge;
  if (info.phase === "pre") return "Starting Soon";
  if (info.phase === "post") return "Until Next Year";

  switch (info.currentPeriod.type) {
    case "break":
      return "Enjoy :)";
    case "exam":
      return "Exams Ongoing";
    case "industrial":
      return "On Placement";
    default:
      return "In Progress";
  }
}

/** e.g. "Semester I 2026/2027", avoiding a doubled session label. */
export function getSessionLabel(
  termLabel: string,
  academicYear: string
): string {
  const session = academicYear.replace("-", "/");
  return session && !termLabel.includes(session)
    ? `${termLabel} ${session}`
    : termLabel;
}
