export type ActivityType =
  | "teaching"
  | "break"
  | "revision"
  | "exam"
  | "industrial";

export interface CalendarPeriod {
  id: string;
  termId: string;
  label: string;
  type: ActivityType;
  startDate: string;
  endDate: string;
  weekStart?: number;
  countsTowardProgress: boolean;
}

export interface CalendarTerm {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface AcademicCalendar {
  institution: string;
  timezone: "Asia/Kuala_Lumpur";
  academicYear: string;
  nextAcademicYearStart?: string;
  terms: CalendarTerm[];
  periods: CalendarPeriod[];
}

export type CalendarPhase = "pre" | "active" | "post";
