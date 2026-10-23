import { describe, expect, it } from "vitest";

import { getCountdownLabel } from "@/lib/calendar/countdown";
import { getCalendarInfo } from "@/lib/calendar/engine";
import { getCalendarForDate, loadCalendar } from "@/lib/calendar/loader";
import type { AcademicCalendar } from "@/lib/calendar/types";

function labelOn(isoDate: string, calendar?: AcademicCalendar): string {
  // Midday UTC is the same calendar day in Asia/Kuala_Lumpur (UTC+8).
  const when = new Date(`${isoDate}T12:00:00.000Z`);
  const selected = calendar ?? getCalendarForDate(when);
  return getCountdownLabel(selected, getCalendarInfo(selected, when));
}

describe("getCountdownLabel", () => {
  it("names the following period while one exists", () => {
    expect(labelOn("2026-10-23")).toBe("Mid-Semester Break starts in");
    expect(labelOn("2026-11-18")).toBe("Semester I starts in");
    expect(labelOn("2027-06-28")).toBe("Long Semester Break starts in");
  });

  it("points at the next academic year from the calendar's final period", () => {
    expect(labelOn("2027-08-10")).toBe("Next academic year starts in");
  });

  it("falls back to the final period's end when no next year is known", () => {
    const calendar = {
      ...loadCalendar("2026-2027"),
      nextAcademicYearStart: undefined,
    };
    expect(labelOn("2027-08-10", calendar)).toBe("Long Semester Break ends in");
  });

  it("states the start date before the calendar begins", () => {
    expect(labelOn("2025-09-01")).toBe("Semester begins on 6 October 2025");
  });

  it("states the real end date once the calendar is complete", () => {
    // Formatting the UTC-anchored end in the campus zone would read 27 September.
    expect(labelOn("2030-01-01")).toBe("Ended on 26 September 2027");
  });
});
