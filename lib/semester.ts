import {
  getCalendarCountdownTarget,
  getCalendarInfo,
  getCountdown,
  type CalendarInfo,
  type CountdownParts,
} from "@/lib/calendar/engine";
import {
  getDefaultCalendar,
  listAvailableAcademicYears,
  loadCalendar,
} from "@/lib/calendar/loader";
import type {
  AcademicCalendar,
  ActivityType,
  CalendarPeriod,
  CalendarPhase,
} from "@/lib/calendar/types";

export { ACTIVITY_TYPE_METADATA, FALLBACK_ACTIVITY_TYPE_META } from "@/lib/calendar/metadata";
export { getCalendarInfo, getCalendarCountdownTarget, getCountdown };
export { getDefaultCalendar, listAvailableAcademicYears, loadCalendar };
export type { AcademicCalendar, ActivityType, CalendarInfo, CalendarPeriod, CountdownParts };

export type Phase = CalendarPhase;

export interface ActivityPeriod {
  id: string;
  termId: string;
  label: string;
  type: ActivityType;
  start: string;
  end: string;
  weekStart?: number;
  countsTowardProgress: boolean;
}

export interface SemesterInfo {
  phase: Phase;
  currentActivity: ActivityPeriod;
  activityStart: Date;
  activityEnd: Date;
  nextActivity: ActivityPeriod | null;
  nextActivityStart: Date | null;
  semesterStart: Date;
  semesterEnd: Date;
  progressPercent: number;
  currentWeek: number | null;
  totalWeeks: number;
  semesterLabel: string;
}

function toLegacyActivity(period: CalendarPeriod): ActivityPeriod {
  return {
    id: period.id,
    termId: period.termId,
    label: period.label,
    type: period.type,
    start: period.startDate,
    end: period.endDate,
    weekStart: period.weekStart,
    countsTowardProgress: period.countsTowardProgress,
  };
}

export function getSemesterInfo(now: Date = new Date()): SemesterInfo {
  const calendar = getDefaultCalendar();
  const info = getCalendarInfo(calendar, now);

  return {
    phase: info.phase,
    currentActivity: toLegacyActivity(info.currentPeriod),
    activityStart: info.periodStart,
    activityEnd: info.periodEnd,
    nextActivity: info.nextPeriod ? toLegacyActivity(info.nextPeriod) : null,
    nextActivityStart: info.nextPeriodStart,
    semesterStart: info.calendarStart,
    semesterEnd: info.calendarEnd,
    progressPercent: info.progressPercent,
    currentWeek: info.currentWeek,
    totalWeeks: info.totalWeeks,
    semesterLabel: info.termLabel,
  };
}

export function getSemesterCountdownTarget(
  calendar: AcademicCalendar,
  info: CalendarInfo
): Date {
  return getCalendarCountdownTarget(calendar, info);
}
