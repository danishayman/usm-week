import {
  getCalendarCountdownTarget,
  getCalendarInfo,
} from "@/lib/calendar/engine";
import { loadCalendar } from "@/lib/calendar/loader";
import { describe, expect, it } from "vitest";

const calendar = loadCalendar("2025-2026");

describe("getCalendarInfo", () => {
  it("resolves exact boundary dates to the correct period", () => {
    const startDay = getCalendarInfo(calendar, new Date("2025-10-06T12:00:00.000Z"));
    const endDay = getCalendarInfo(calendar, new Date("2025-11-23T12:00:00.000Z"));
    const nextDay = getCalendarInfo(calendar, new Date("2025-11-24T12:00:00.000Z"));

    expect(startDay.currentPeriod.id).toBe("sem1-teaching-01");
    expect(endDay.currentPeriod.id).toBe("sem1-teaching-01");
    expect(nextDay.currentPeriod.id).toBe("sem1-mid-break");
  });

  it("returns pre, active, and post phase correctly", () => {
    const pre = getCalendarInfo(calendar, new Date("2025-10-05T12:00:00.000Z"));
    const active = getCalendarInfo(calendar, new Date("2026-03-16T12:00:00.000Z"));
    const post = getCalendarInfo(calendar, new Date("2026-09-28T12:00:00.000Z"));

    expect(pre.phase).toBe("pre");
    expect(active.phase).toBe("active");
    expect(post.phase).toBe("post");
  });

  it("reaches 100% progress at the end of teaching week 15", () => {
    const beforeWeek15End = getCalendarInfo(
      calendar,
      new Date("2026-01-11T12:00:00.000Z")
    );
    const week15End = getCalendarInfo(calendar, new Date("2026-01-18T12:00:00.000Z"));
    const revisionWeek = getCalendarInfo(calendar, new Date("2026-01-20T12:00:00.000Z"));

    expect(beforeWeek15End.progressPercent).toBeLessThan(100);
    expect(week15End.progressPercent).toBe(100);
    expect(revisionWeek.progressPercent).toBe(100);
  });

  it("falls back to nextAcademicYearStart when there is no next period", () => {
    const finalBreakInfo = getCalendarInfo(
      calendar,
      new Date("2026-08-10T12:00:00.000Z")
    );
    expect(finalBreakInfo.nextPeriod).toBeNull();

    const fallbackTarget = getCalendarCountdownTarget(calendar, finalBreakInfo);
    expect(fallbackTarget.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("matches known regression dates to expected period ids", () => {
    const cases = [
      { at: "2026-02-20T12:00:00.000Z", expectedId: "sem1-term-break" },
      { at: "2026-03-16T12:00:00.000Z", expectedId: "sem2-teaching-01" },
      { at: "2026-07-06T12:00:00.000Z", expectedId: "sem2-pre-exam-break" },
    ] as const;

    for (const scenario of cases) {
      const info = getCalendarInfo(calendar, new Date(scenario.at));
      expect(info.currentPeriod.id).toBe(scenario.expectedId);
    }
  });
});
