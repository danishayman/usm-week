import { describe, expect, it } from "vitest";

import { getDailyCountdownLine } from "@/lib/calendar/countdown";
import { getCalendarInfo } from "@/lib/calendar/engine";
import { getCalendarForDate, loadCalendar } from "@/lib/calendar/loader";
import type { AcademicCalendar } from "@/lib/calendar/types";

function lineAt(when: Date, calendar = getCalendarForDate(when)): string {
  return getDailyCountdownLine(calendar, getCalendarInfo(calendar, when), when);
}

function lineOn(isoDate: string, calendar?: AcademicCalendar): string {
  // Midday UTC is the same calendar day in Asia/Kuala_Lumpur (UTC+8).
  return lineAt(new Date(`${isoDate}T12:00:00.000Z`), calendar);
}

describe("getDailyCountdownLine", () => {
  it("counts down to the following period in whole days", () => {
    // Semester I week 4; the mid-semester break starts 2026-11-16.
    expect(lineOn("2026-10-23")).toBe("Mid-Semester Break starts in 24 days");
    expect(lineOn("2026-11-14")).toBe("Mid-Semester Break starts in 2 days");
    expect(lineOn("2026-11-15")).toBe("Mid-Semester Break starts in 1 day");
    expect(lineOn("2026-11-16")).toBe("Semester I starts in 7 days");
  });

  it("does not read one day short when posted just after midnight", () => {
    // 00:05 on 2026-11-14 in Kuala Lumpur.
    expect(lineAt(new Date("2026-11-13T16:05:00.000Z"))).toBe(
      "Mid-Semester Break starts in 2 days"
    );
  });

  it("points at the next academic year from the calendar's final period", () => {
    // Long Semester Break is the last period; 2027-09-27 starts 2027/2028.
    expect(lineOn("2027-09-20")).toBe("Next academic year starts in 7 days");
    expect(lineOn("2027-09-26")).toBe("Next academic year starts in 1 day");
  });

  it("counts down to the end of the final period when no next year is known", () => {
    const calendar = {
      ...loadCalendar("2026-2027"),
      nextAcademicYearStart: undefined,
    };

    expect(lineOn("2027-09-20", calendar)).toBe(
      "Long Semester Break ends in 7 days"
    );
    expect(lineOn("2027-09-26", calendar)).toBe(
      "Long Semester Break ends in 1 day"
    );
  });

  it("states the start date before the calendar begins", () => {
    expect(lineOn("2025-09-01")).toBe("Semester begins on 6 October 2025");
  });

  it("states the end date once the calendar is complete", () => {
    expect(lineOn("2030-01-01")).toBe("Ended on 26 September 2027");
  });
});
