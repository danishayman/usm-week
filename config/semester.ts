// ─── Semester Configuration ───────────────────────────────────────────────────
// Fill in all activity periods below.
// Dates are ISO 8601 (YYYY-MM-DD), inclusive start and end.
// The dashboard will automatically detect the current activity and count
// down to when it ends. Add, remove, or edit periods freely.
//
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
  /** First day of this period (ISO 8601) */
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
   * Ordered list of activity periods that make up the semester.
   * They must be in chronological order with no overlaps.
   */
  ACTIVITIES: [
    {
      label: "Teaching & Learning",
      type: "teaching",
      start: "2025-10-06",
      end: "2025-11-16",
      weekStart: 1,
    },
    {
      label: "Mid-Semester Break",
      type: "break",
      start: "2025-11-17",
      end: "2025-11-23",
    },
    {
      label: "Teaching & Learning",
      type: "teaching",
      start: "2025-11-24",
      end: "2026-01-04",
      weekStart: 9,
    },
    {
      label: "Revision Week",
      type: "revision",
      start: "2026-01-05",
      end: "2026-01-11",
      weekStart: 16,
    },
    {
      label: "Examination",
      type: "exam",
      start: "2026-01-12",
      end: "2026-01-31",
    },
    {
      label: "Long Semester Break",
      type: "break",
      start: "2026-02-01",
      end: "2026-04-05",
    },
  ] satisfies ActivityPeriod[],
} as const;

export type SemesterConfig = typeof SEMESTER_CONFIG;
