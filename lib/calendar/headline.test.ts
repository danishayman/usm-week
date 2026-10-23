import { describe, expect, it } from "vitest";

import { getCalendarInfo } from "@/lib/calendar/engine";
import { getHeadline, getProgressCaption } from "@/lib/calendar/headline";
import { getCalendarForDate } from "@/lib/calendar/loader";

function headlineOn(isoDate: string): string {
  // Midday UTC is the same calendar day in Asia/Kuala_Lumpur (UTC+8).
  const when = new Date(`${isoDate}T12:00:00.000Z`);
  return getHeadline(getCalendarInfo(getCalendarForDate(when), when));
}

describe("getHeadline", () => {
  it("shows the week number for every numbered period", () => {
    const cases: [string, string][] = [
      ["2026-09-28", "Week 1"], // Semester I, first teaching day
      ["2026-10-19", "Week 4"],
      ["2026-11-15", "Week 7"], // last day before the mid-semester break
      ["2026-11-16", "Week 8"], // the break itself is numbered
      ["2026-11-23", "Week 9"],
      ["2027-01-10", "Week 15"], // last teaching day
      ["2027-01-11", "Week 16"], // revision
      ["2027-01-18", "Week 17"], // examination
      ["2027-02-08", "Week 20"], // semester break
      ["2027-03-08", "Week 1"], // Semester II restarts the count
      ["2027-06-20", "Week 15"],
      ["2027-06-21", "Week 16"],
    ];

    for (const [isoDate, expected] of cases) {
      expect([isoDate, headlineOn(isoDate)]).toEqual([isoDate, expected]);
    }
  });

  it("falls back to a status phrase only where no week number exists", () => {
    // Semester II's exam and long break are authored without a weekStart.
    expect(headlineOn("2027-06-28")).toBe("Exams Ongoing");
    expect(headlineOn("2027-07-19")).toBe("Enjoy :)");
    expect(headlineOn("2027-09-26")).toBe("Enjoy :)");
  });

  it("covers the ends of the calendar", () => {
    expect(headlineOn("2030-01-01")).toBe("Until Next Year");
  });
});

describe("getProgressCaption", () => {
  function captionAt(iso: string): string {
    const when = new Date(iso);
    const calendar = getCalendarForDate(when);
    return getProgressCaption(getCalendarInfo(calendar, when), calendar.academicYear);
  }

  it("states the session and progress to two decimal places", () => {
    // Midnight in Kuala Lumpur as Semester I starts, and as its teaching ends.
    expect(captionAt("2026-09-27T16:00:00.000Z")).toBe(
      "Semester I 2026/2027 is 0.00% complete."
    );
    expect(captionAt("2027-01-10T16:00:00.000Z")).toBe(
      "Semester I 2026/2027 is 100.00% complete."
    );
  });
});
