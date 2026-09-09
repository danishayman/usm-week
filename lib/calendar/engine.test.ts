import {
  getCalendarCountdownTarget,
  getCalendarInfo,
} from "@/lib/calendar/engine";
import { loadCalendar } from "@/lib/calendar/loader";
import { validateCalendar } from "@/lib/calendar/validation";
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

  it("reaches 100% progress at the end of the final teaching block", () => {
    const beforeWeek15End = getCalendarInfo(
      calendar,
      new Date("2026-01-11T12:00:00.000Z")
    );
    const finalDay = getCalendarInfo(calendar, new Date("2026-01-18T12:00:00.000Z"));
    const week15End = getCalendarInfo(calendar, new Date("2026-01-18T16:00:00.000Z"));
    const revisionWeek = getCalendarInfo(calendar, new Date("2026-01-20T12:00:00.000Z"));

    expect(beforeWeek15End.progressPercent).toBeLessThan(100);
    expect(finalDay.progressPercent).toBeGreaterThan(99);
    expect(finalDay.progressPercent).toBeLessThan(100);
    expect(week15End.progressPercent).toBe(100);
    expect(revisionWeek.progressPercent).toBe(100);
  });

  it("uses the shortened Semester II final teaching week dates", () => {
    const finalTeachingDay = getCalendarInfo(
      calendar,
      new Date("2026-06-26T12:00:00.000Z")
    );
    const finalTeachingEnd = getCalendarInfo(
      calendar,
      new Date("2026-06-26T16:00:00.000Z")
    );
    const revisionStart = getCalendarInfo(
      calendar,
      new Date("2026-06-27T12:00:00.000Z")
    );

    expect(finalTeachingDay.currentPeriod.id).toBe("sem2-teaching-02");
    expect(finalTeachingDay.currentWeek).toBe(15);
    expect(finalTeachingDay.progressPercent).toBeLessThan(100);
    expect(finalTeachingEnd.progressPercent).toBe(100);
    expect(revisionStart.currentPeriod.id).toBe("sem2-revision");
    expect(revisionStart.currentWeek).toBe(16);
  });

  it("falls back to nextAcademicYearStart when there is no next period", () => {
    const finalBreakInfo = getCalendarInfo(
      calendar,
      new Date("2026-08-10T12:00:00.000Z")
    );
    expect(finalBreakInfo.nextPeriod).toBeNull();

    const fallbackTarget = getCalendarCountdownTarget(calendar, finalBreakInfo);
    expect(fallbackTarget.toISOString()).toBe("2026-09-27T16:00:00.000Z");
  });

  it("uses calendar timezone midnight for next period countdown target", () => {
    const teachingWeek7 = getCalendarInfo(
      calendar,
      new Date("2026-05-02T12:00:00.000Z")
    );

    const target = getCalendarCountdownTarget(calendar, teachingWeek7);
    expect(target.toISOString()).toBe("2026-05-03T16:00:00.000Z");
  });

  it("matches known regression dates to expected period ids", () => {
    const cases = [
      { at: "2026-02-20T12:00:00.000Z", expectedId: "sem1-term-break" },
      { at: "2026-03-16T12:00:00.000Z", expectedId: "sem2-teaching-01" },
      { at: "2026-07-06T12:00:00.000Z", expectedId: "sem2-exam" },
    ] as const;

    for (const scenario of cases) {
      const info = getCalendarInfo(calendar, new Date(scenario.at));
      expect(info.currentPeriod.id).toBe(scenario.expectedId);
    }
  });
});

describe("progress endpoint is derived from the data", () => {
  const term = { id: "sem-1", label: "Semester I", startDate: "2026-09-28", endDate: "2027-03-14" };

  function build(periods: unknown[]) {
    return validateCalendar({
      institution: "Universiti Sains Malaysia",
      timezone: "Asia/Kuala_Lumpur",
      academicYear: "2026-2027",
      terms: [term],
      periods,
    });
  }

  // 14 teaching weeks as always, but the mid-semester break runs two weeks, so
  // teaching occupies week numbers 10-16 and week 15 is no longer the last one.
  const twoWeekBreak = build([
    { id: "t1", termId: "sem-1", label: "Semester I", type: "teaching", startDate: "2026-09-28", endDate: "2026-11-15", weekStart: 1, countsTowardProgress: true },
    { id: "b1", termId: "sem-1", label: "Mid-Semester Break", type: "break", startDate: "2026-11-16", endDate: "2026-11-29", weekStart: 8, countsTowardProgress: false },
    { id: "t2", termId: "sem-1", label: "Semester I", type: "teaching", startDate: "2026-11-30", endDate: "2027-01-17", weekStart: 10, countsTowardProgress: true },
    { id: "r1", termId: "sem-1", label: "Revision Week", type: "revision", startDate: "2027-01-18", endDate: "2027-01-24", weekStart: 17, countsTowardProgress: false },
    { id: "e1", termId: "sem-1", label: "Examination", type: "exam", startDate: "2027-01-25", endDate: "2027-02-14", weekStart: 18, countsTowardProgress: false },
    { id: "k1", termId: "sem-1", label: "Semester Break", type: "break", startDate: "2027-02-15", endDate: "2027-03-14", weekStart: 21, countsTowardProgress: false },
  ]);

  // The break carries no weekStart -- the same authoring style already used by
  // sem2-exam and sem2-long-break -- so no period spans week number 15 at all.
  const unnumberedBreak = build([
    { id: "t1", termId: "sem-1", label: "Semester I", type: "teaching", startDate: "2026-09-28", endDate: "2026-11-15", weekStart: 1, countsTowardProgress: true },
    { id: "b1", termId: "sem-1", label: "Mid-Semester Break", type: "break", startDate: "2026-11-16", endDate: "2026-11-22", countsTowardProgress: false },
    { id: "t2", termId: "sem-1", label: "Semester I", type: "teaching", startDate: "2026-11-23", endDate: "2027-01-10", weekStart: 8, countsTowardProgress: true },
    { id: "r1", termId: "sem-1", label: "Revision Week", type: "revision", startDate: "2027-01-11", endDate: "2027-01-17", weekStart: 15, countsTowardProgress: false },
    { id: "e1", termId: "sem-1", label: "Examination", type: "exam", startDate: "2027-01-18", endDate: "2027-02-07", weekStart: 16, countsTowardProgress: false },
    { id: "k1", termId: "sem-1", label: "Semester Break", type: "break", startDate: "2027-02-08", endDate: "2027-03-14", weekStart: 19, countsTowardProgress: false },
  ]);

  it("fills exactly when teaching ends, whatever shape the break is", () => {
    // Two-week break: teaching ends 2027-01-17, not at week number 15.
    expect(
      getCalendarInfo(twoWeekBreak, new Date("2027-01-11T04:00:00.000Z")).progressPercent
    ).toBeLessThan(100);
    expect(
      getCalendarInfo(twoWeekBreak, new Date("2027-01-17T16:00:00.000Z")).progressPercent
    ).toBe(100);

    // Unnumbered break: teaching ends 2027-01-10 and no period spans week 15.
    expect(
      getCalendarInfo(unnumberedBreak, new Date("2027-01-10T16:00:00.000Z")).progressPercent
    ).toBe(100);
  });

  it("does not keep filling through revision, exams and the break", () => {
    for (const calendarUnderTest of [twoWeekBreak, unnumberedBreak]) {
      expect(
        getCalendarInfo(calendarUnderTest, new Date("2027-02-20T04:00:00.000Z")).progressPercent
      ).toBe(100);
      expect(
        getCalendarInfo(calendarUnderTest, new Date("2027-03-14T04:00:00.000Z")).progressPercent
      ).toBe(100);
    }
  });
});
