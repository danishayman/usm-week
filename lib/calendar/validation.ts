import { z } from "zod";

import {
  inclusiveDaysBetween,
  isIsoDateString,
  isoDateToEpochDay,
} from "@/lib/calendar/date";
import type { AcademicCalendar, CalendarPeriod } from "@/lib/calendar/types";

const ISO_DATE_ERROR = "Date must be a valid ISO-8601 date (YYYY-MM-DD).";
const ASIA_KL = "Asia/Kuala_Lumpur";

const isoDateSchema = z
  .string()
  .refine((value) => isIsoDateString(value), ISO_DATE_ERROR);

const termSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

const periodSchema = z.object({
  id: z.string().min(1),
  termId: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["teaching", "break", "revision", "exam", "industrial"]),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  weekStart: z.number().int().positive().optional(),
  countsTowardProgress: z.boolean(),
});

function checkRangeOrder(
  startDate: string,
  endDate: string,
  path: (string | number)[],
  ctx: z.RefinementCtx,
  label: string
): boolean {
  const startDay = isoDateToEpochDay(startDate);
  const endDay = isoDateToEpochDay(endDate);
  if (startDay > endDay) {
    ctx.addIssue({
      code: "custom",
      message: `${label}: startDate must be <= endDate.`,
      path,
    });
    return false;
  }

  return true;
}

function checkWeekContinuityByTerm(
  periods: CalendarPeriod[],
  termId: string,
  ctx: z.RefinementCtx
): void {
  const periodsInTerm = periods.filter((period) => period.termId === termId);
  let previousLastWeek: number | null = null;

  for (const period of periodsInTerm) {
    if (period.weekStart === undefined) continue;

    const durationInDays = inclusiveDaysBetween(period.startDate, period.endDate);
    if (durationInDays % 7 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: `Period "${period.id}" with weekStart must span full weeks.`,
        path: ["periods"],
      });
      continue;
    }

    const weeksInPeriod = durationInDays / 7;
    const periodLastWeek = period.weekStart + weeksInPeriod - 1;

    if (previousLastWeek === null) {
      if (period.weekStart !== 1) {
        ctx.addIssue({
          code: "custom",
          message: `First week-tracked period in term "${termId}" must start at week 1.`,
          path: ["periods"],
        });
      }
    } else if (period.weekStart !== previousLastWeek + 1) {
      ctx.addIssue({
        code: "custom",
        message: `Broken week continuity in term "${termId}" at period "${period.id}".`,
        path: ["periods"],
      });
    }

    previousLastWeek = periodLastWeek;
  }
}

export const academicCalendarSchema = z
  .object({
    institution: z.string().min(1),
    timezone: z.literal(ASIA_KL),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/),
    nextAcademicYearStart: isoDateSchema.optional(),
    terms: z.array(termSchema).min(1),
    periods: z.array(periodSchema).min(1),
  })
  .superRefine((calendar, ctx) => {
    const termById = new Map(calendar.terms.map((term) => [term.id, term]));
    const seenPeriodIds = new Set<string>();

    for (let i = 0; i < calendar.terms.length; i++) {
      const term = calendar.terms[i];
      const isValidRange = checkRangeOrder(
        term.startDate,
        term.endDate,
        ["terms", i],
        ctx,
        `Term "${term.id}"`
      );
      if (!isValidRange) continue;

      if (i > 0) {
        const previous = calendar.terms[i - 1];
        const previousEnd = isoDateToEpochDay(previous.endDate);
        const currentStart = isoDateToEpochDay(term.startDate);
        if (currentStart <= previousEnd) {
          ctx.addIssue({
            code: "custom",
            message: "Terms must be strictly chronological and non-overlapping.",
            path: ["terms", i],
          });
        }
      }
    }

    for (let i = 0; i < calendar.periods.length; i++) {
      const period = calendar.periods[i];
      const isValidRange = checkRangeOrder(
        period.startDate,
        period.endDate,
        ["periods", i],
        ctx,
        `Period "${period.id}"`
      );
      if (!isValidRange) continue;

      if (seenPeriodIds.has(period.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate period id "${period.id}".`,
          path: ["periods", i, "id"],
        });
      }
      seenPeriodIds.add(period.id);

      if (!termById.has(period.termId)) {
        ctx.addIssue({
          code: "custom",
          message: `Period "${period.id}" references unknown term "${period.termId}".`,
          path: ["periods", i, "termId"],
        });
      } else {
        const term = termById.get(period.termId)!;
        const termStart = isoDateToEpochDay(term.startDate);
        const termEnd = isoDateToEpochDay(term.endDate);
        const periodStart = isoDateToEpochDay(period.startDate);
        const periodEnd = isoDateToEpochDay(period.endDate);

        if (periodStart < termStart || periodEnd > termEnd) {
          ctx.addIssue({
            code: "custom",
            message: `Period "${period.id}" must be within term "${period.termId}" boundaries.`,
            path: ["periods", i],
          });
        }
      }

      if (period.countsTowardProgress && period.weekStart === undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Period "${period.id}" countsTowardProgress requires weekStart.`,
          path: ["periods", i],
        });
      }

      if (i > 0) {
        const previous = calendar.periods[i - 1];
        const previousEnd = isoDateToEpochDay(previous.endDate);
        const currentStart = isoDateToEpochDay(period.startDate);
        if (currentStart <= previousEnd) {
          ctx.addIssue({
            code: "custom",
            message: "Periods must be strictly chronological and non-overlapping.",
            path: ["periods", i],
          });
        }
        if (currentStart > previousEnd + 1) {
          ctx.addIssue({
            code: "custom",
            message:
              "Detected an implicit gap between periods. Add an explicit period for gap days.",
            path: ["periods", i],
          });
        }
      }
    }

    for (const term of calendar.terms) {
      checkWeekContinuityByTerm(calendar.periods, term.id, ctx);
    }
  });

function formatValidationIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("\n");
}

export function validateCalendar(input: unknown): AcademicCalendar {
  const result = academicCalendarSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid academic calendar data:\n${formatValidationIssues(result.error)}`
    );
  }

  return result.data;
}
