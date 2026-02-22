// ─── Semester Configuration ─────────────────────────────────────────────────
// Edit SEMESTER_START and SEMESTER_END to reflect current semester dates.
// TOTAL_WEEKS is derived automatically

export const SEMESTER_CONFIG = {
  /** First day of the semester (ISO 8601) */
  SEMESTER_START: "2025-10-06",

  /** Last day of the semester (inclusive, ISO 8601) */
  SEMESTER_END: "2026-02-15",

  /** Label shown for the semester */
  SEMESTER_LABEL: "Semester I 2025/2026",

} as const;

export type SemesterConfig = typeof SEMESTER_CONFIG;
