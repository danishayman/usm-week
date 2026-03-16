import rawCalendar from "@/data/calendars/usm-2025-2026.json";
import { validateCalendar } from "@/lib/calendar/validation";
import { describe, expect, it } from "vitest";

function cloneCalendar(): typeof rawCalendar {
  return JSON.parse(JSON.stringify(rawCalendar)) as typeof rawCalendar;
}

describe("validateCalendar", () => {
  it("accepts the bundled production calendar", () => {
    expect(() => validateCalendar(rawCalendar)).not.toThrow();
  });

  it("rejects malformed ISO dates", () => {
    const calendar = cloneCalendar();
    calendar.periods[0].startDate = "2025-13-40";
    expect(() => validateCalendar(calendar)).toThrow();
  });

  it("rejects overlapping periods", () => {
    const calendar = cloneCalendar();
    calendar.periods[1].startDate = "2025-11-23";
    expect(() => validateCalendar(calendar)).toThrow();
  });

  it("rejects unsorted periods", () => {
    const calendar = cloneCalendar();
    const second = calendar.periods[1];
    calendar.periods[1] = calendar.periods[2];
    calendar.periods[2] = second;
    expect(() => validateCalendar(calendar)).toThrow();
  });

  it("rejects broken week sequence", () => {
    const calendar = cloneCalendar();
    const target = calendar.periods.find((period) => period.id === "sem1-teaching-02");
    if (!target) throw new Error("Missing sem1-teaching-02 test fixture");
    target.weekStart = 10;
    expect(() => validateCalendar(calendar)).toThrow();
  });

  it("rejects implicit date gaps", () => {
    const calendar = cloneCalendar();
    calendar.periods[10].startDate = "2026-07-07";
    expect(() => validateCalendar(calendar)).toThrow();
  });
});
