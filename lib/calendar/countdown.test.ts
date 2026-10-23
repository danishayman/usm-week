import { describe, expect, it } from "vitest";

import { getDailyCountdown, type DailyCountdown } from "@/lib/calendar/countdown";
import { getCalendarInfo } from "@/lib/calendar/engine";
import { getCalendarForDate, loadCalendar } from "@/lib/calendar/loader";
import type { AcademicCalendar } from "@/lib/calendar/types";

function countdownAt(
  when: Date,
  calendar = getCalendarForDate(when)
): DailyCountdown {
  return getDailyCountdown(calendar, getCalendarInfo(calendar, when), when);
}

function countdownOn(
  isoDate: string,
  calendar?: AcademicCalendar
): DailyCountdown {
  // Midday UTC is the same calendar day in Asia/Kuala_Lumpur (UTC+8).
  return countdownAt(new Date(`${isoDate}T12:00:00.000Z`), calendar);
}

describe("getDailyCountdown", () => {
  it("counts down to the following period in whole days", () => {
    // Semester I week 4; the mid-semester break starts 2026-11-16.
    const toBreak = { label: "Mid-Semester Break starts in" };
    expect(countdownOn("2026-10-23")).toEqual({ ...toBreak, days: 24 });
    expect(countdownOn("2026-11-14")).toEqual({ ...toBreak, days: 2 });
    expect(countdownOn("2026-11-15")).toEqual({ ...toBreak, days: 1 });
    expect(countdownOn("2026-11-16")).toEqual({
      label: "Semester I starts in",
      days: 7,
    });
  });

  it("does not read one day short when posted just after midnight", () => {
    // 00:05 on 2026-11-14 in Kuala Lumpur.
    expect(countdownAt(new Date("2026-11-13T16:05:00.000Z"))).toEqual({
      label: "Mid-Semester Break starts in",
      days: 2,
    });
  });

  it("points at the next academic year from the calendar's final period", () => {
    // Long Semester Break is the last period; 2027-09-27 starts 2027/2028.
    const label = "Next academic year starts in";
    expect(countdownOn("2027-09-20")).toEqual({ label, days: 7 });
    expect(countdownOn("2027-09-26")).toEqual({ label, days: 1 });
  });

  it("counts down to the end of the final period when no next year is known", () => {
    const calendar = {
      ...loadCalendar("2026-2027"),
      nextAcademicYearStart: undefined,
    };
    const label = "Long Semester Break ends in";

    expect(countdownOn("2027-09-20", calendar)).toEqual({ label, days: 7 });
    expect(countdownOn("2027-09-26", calendar)).toEqual({ label, days: 1 });
  });

  it("counts down to the first day before the calendar begins", () => {
    expect(countdownOn("2025-09-01")).toEqual({
      label: "Semester begins on 6 October 2025",
      days: 35,
    });
  });

  it("states the end date and drops the countdown once the calendar is complete", () => {
    expect(countdownOn("2030-01-01")).toEqual({
      label: "Ended on 26 September 2027",
      days: null,
    });
  });
});
