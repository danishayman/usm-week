import rawUsm20252026 from "@/data/calendars/usm-2025-2026.json";
import type { AcademicCalendar } from "@/lib/calendar/types";
import { validateCalendar } from "@/lib/calendar/validation";

export const DEFAULT_ACADEMIC_YEAR = "2025-2026";

const CALENDAR_REGISTRY: Record<string, unknown> = {
  "2025-2026": rawUsm20252026,
};

const validatedCache = new Map<string, AcademicCalendar>();

export function listAvailableAcademicYears(): string[] {
  return Object.keys(CALENDAR_REGISTRY);
}

export function loadCalendar(academicYear: string): AcademicCalendar {
  const cached = validatedCache.get(academicYear);
  if (cached) return cached;

  const rawCalendar = CALENDAR_REGISTRY[academicYear];
  if (!rawCalendar) {
    throw new Error(
      `Calendar "${academicYear}" not found. Available: ${listAvailableAcademicYears().join(
        ", "
      )}`
    );
  }

  const validated = validateCalendar(rawCalendar);
  validatedCache.set(academicYear, validated);
  return validated;
}

export function getDefaultCalendar(): AcademicCalendar {
  return loadCalendar(DEFAULT_ACADEMIC_YEAR);
}

// Validate all bundled calendars at import time so builds/dev fail fast.
for (const academicYear of listAvailableAcademicYears()) {
  loadCalendar(academicYear);
}
