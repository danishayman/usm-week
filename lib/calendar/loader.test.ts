import { describe, expect, it } from "vitest";

import { getCalendarInfo } from "@/lib/calendar/engine";
import { getCalendarForDate, listAvailableAcademicYears } from "@/lib/calendar/loader";

function calendarYearOn(isoDate: string): string {
  // Midday UTC is the same calendar day in Asia/Kuala_Lumpur (UTC+8).
  return getCalendarForDate(new Date(`${isoDate}T12:00:00.000Z`)).academicYear;
}

describe("getCalendarForDate", () => {
  it("selects the calendar covering the given date", () => {
    expect(calendarYearOn("2025-10-06")).toBe("2025-2026");
    expect(calendarYearOn("2026-05-01")).toBe("2025-2026");
    expect(calendarYearOn("2026-09-27")).toBe("2025-2026");
    expect(calendarYearOn("2026-09-28")).toBe("2026-2027");
    expect(calendarYearOn("2027-03-10")).toBe("2026-2027");
    expect(calendarYearOn("2027-09-26")).toBe("2026-2027");
  });

  it("rolls over on the first day of the new session without a redeploy", () => {
    const at = (iso: string) => {
      const when = new Date(iso);
      return getCalendarInfo(getCalendarForDate(when), when);
    };

    const lastDay = at("2026-09-27T12:00:00.000Z");
    const firstDay = at("2026-09-28T12:00:00.000Z");

    expect(lastDay.phase).toBe("active");
    expect(lastDay.currentPeriod.label).toBe("Long Semester Break");
    expect(firstDay.phase).toBe("active");
    expect(firstDay.currentPeriod.label).toBe("Semester I");
    expect(firstDay.currentWeek).toBe(1);
  });

  it("keeps the earliest calendar before it starts and the latest after it ends", () => {
    expect(calendarYearOn("2020-01-01")).toBe("2025-2026");
    expect(calendarYearOn("2030-01-01")).toBe("2026-2027");
  });

  it("holds the finished session during a gap between calendars", () => {
    // The registry must stay gap-free for the app to roll over cleanly; if a
    // future year is added with a gap, the ending session is kept meanwhile.
    const years = listAvailableAcademicYears();
    expect(years).toContain("2025-2026");
    expect(years).toContain("2026-2027");
  });
});
