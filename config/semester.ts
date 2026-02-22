// ─── Semester Configuration ───────────────────────────────────────────────────
// Fill in all activity periods below.
// Dates are ISO 8601 (YYYY-MM-DD), inclusive start and end.
// Week numbering resets to 1 at each T&L block unless you specify
// weekOffset: N to continue from a previous block.

export type ActivityType =
  | "teaching"
  | "break"
  | "revision"  
  | "exam"
  | "industrial";

export interface ActivityPeriod {
  /** Display label shown on the dashboard */
  label: string;
  /** Activity category — used for colour coding */
  type: ActivityType;
  /** First day of this period  */
  start: string;
  /** Last day of this period (ISO 8601, inclusive) */
  end: string;
  /**
   * If this is a teaching block, set the week number of its FIRST week.
   * Leave undefined for non-teaching blocks.
   */
  weekStart?: number;
}

export const SEMESTER_CONFIG = {
  /** Label shown for the overall semester */
  SEMESTER_LABEL: "Semester I 2025/2026",

  /**
   * Optional: start date of the NEXT semester (ISO 8601).
   * Used as the countdown target when the current semester's last activity has no successor.
   */
  NEXT_SEMESTER_START: "2026-04-06",
  NEXT_SEMESTER_LABEL: "Semester II 2025/2026",

  /**
   * Ordered list of activity periods that make up the semester.
   *Must be in chronological order
   */
  ACTIVITIES: [
    {
      label: "Semester I",
      type: "teaching",
      start: "2025-10-06",
      end: "2025-11-23",
      weekStart: 1,
    },
    {
      label: "Mid-Semester Break",
      type: "break",
      start: "2025-11-24",
      end: "2025-11-30",
      weekStart: 8,
    },
    {
      label: "Semester I",
      type: "teaching",
      start: "2025-12-01",
      end: "2026-01-18",
      weekStart: 9,
    },
    {
      label: "Revision Week",
      type: "revision",
      start: "2026-01-19",
      end: "2026-01-25",
      weekStart: 16,
    },
    {
      label: "Examination",
      type: "exam",
      start: "2026-01-26",
      end: "2026-02-15",
      weekStart: 17,
    },
    {
      label: "Semester Break",
      type: "break",
      start: "2026-02-16",
      end: "2026-03-15",
      weekStart: 20,
    },
    {
      label: "Semester II",
      type: "teaching",
      start: "2026-03-16",
      end: "2026-05-03",
      weekStart: 1,
    },
    {
      label: "Mid-Semester Break",
      type: "break",
      start: "2026-05-04",
      end: "2026-05-10",
      weekStart: 8,
    },
    {
      label: "Semester II",
      type: "teaching",
      start: "2026-05-11",
      end: "2026-06-28",
      weekStart: 9,
    },
    {
      label: "Revision Week",
      type: "revision",
      start: "2026-06-29",
      end: "2026-07-05",
      weekStart: 16,
    },
    {
      label: "Examination",
      type: "exam",
      start: "2026-07-08",
      end: "2026-07-26",
      weekStart: 17,
    },
    {
      label: "Long Semester Break",
      type: "break",
      start: "2026-07-27",
      end: "2026-09-27",
      weekStart: 20,
    },



  ] satisfies ActivityPeriod[],
} as const;

export type SemesterConfig = typeof SEMESTER_CONFIG;
