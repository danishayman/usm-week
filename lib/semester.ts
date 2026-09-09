// Barrel for the calendar module, so UI code has a single import site.
export {
  ACTIVITY_TYPE_METADATA,
  FALLBACK_ACTIVITY_TYPE_META,
} from "@/lib/calendar/metadata";
export {
  getCalendarCountdownTarget,
  getCalendarInfo,
  getCountdown,
} from "@/lib/calendar/engine";
export {
  getCalendarForDate,
  getDefaultCalendar,
  listAvailableAcademicYears,
  loadCalendar,
} from "@/lib/calendar/loader";

export type { CalendarInfo, CountdownParts } from "@/lib/calendar/engine";
export type {
  AcademicCalendar,
  ActivityType,
  CalendarPeriod,
  CalendarPhase,
} from "@/lib/calendar/types";
