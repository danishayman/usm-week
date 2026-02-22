import { SEMESTER_CONFIG, type ActivityPeriod } from "@/config/semester";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Phase = "pre" | "active" | "post";

export interface SemesterInfo {
    phase: Phase;
    /** The currently active (or most-recently-ended) activity */
    currentActivity: ActivityPeriod;
    /** Start of the current activity period */
    activityStart: Date;
    /** End of the current activity period */
    activityEnd: Date;
    /** The next activity period after the current one, or null if this is the last */
    nextActivity: ActivityPeriod | null;
    /** Start date of the next activity period */
    nextActivityStart: Date | null;
    /** First day of the whole semester */
    semesterStart: Date;
    /** Last day of the whole semester */
    semesterEnd: Date;
    /** 0–100 overall semester progress */
    progressPercent: number;
    /**
     * Current week number within the semester calendar.
     * Based on the nearest teaching block's weekStart offset.
     * null when in a non-week-tracked period (e.g., exam, long break).
     */
    currentWeek: number | null;
    /** Total teaching + revision weeks in the semester */
    totalWeeks: number;
}

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    /** total milliseconds remaining */
    total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(iso: string, endOfDay = false): Date {
    return new Date(iso + (endOfDay ? "T23:59:59" : "T00:00:00"));
}

/**
 * Split activities into semester groups.
 * A new semester starts whenever weekStart resets to 1.
 */
function getSemesterGroups(
    activities: readonly ActivityPeriod[]
): ActivityPeriod[][] {
    const groups: ActivityPeriod[][] = [];
    let current: ActivityPeriod[] = [];

    for (let i = 0; i < activities.length; i++) {
        if (i > 0 && activities[i].weekStart === 1) {
            groups.push(current);
            current = [];
        }
        current.push(activities[i]);
    }
    if (current.length > 0) groups.push(current);
    return groups;
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

export function getSemesterInfo(now: Date = new Date()): SemesterInfo {
    const activities = SEMESTER_CONFIG.ACTIVITIES as readonly ActivityPeriod[];

    // Derive overall semester boundaries from the activity list
    const semesterStart = parseDate(activities[0].start);
    const semesterEnd = parseDate(activities[activities.length - 1].end, true);

    const today = startOfDay(now);
    const startDay = startOfDay(semesterStart);
    const endDay = startOfDay(semesterEnd);

    // ── Total tracked weeks (teaching + revision blocks only) ────────────────
    const totalWeeks = activities
        .filter((a) => a.weekStart !== undefined)
        .reduce((acc, a) => {
            const wStart = parseDate(a.start);
            const wEnd = parseDate(a.end, true);
            const weeks = Math.round(
                (wEnd.getTime() - wStart.getTime()) / MS_PER_WEEK
            );
            return acc + weeks;
        }, 0);

    // ── Per-semester progress (0 → 100 % at end of teaching week 15) ────────
    const SEMESTER_TEACHING_WEEKS = 15;
    const semesterGroups = getSemesterGroups(activities);

    // Determine which semester group the current date belongs to
    let currentGroup = semesterGroups[0];
    for (const group of semesterGroups) {
        const gStart = parseDate(group[0].start);
        const gEnd = parseDate(group[group.length - 1].end, true);
        if (now >= gStart && now <= gEnd) {
            currentGroup = group;
            break;
        }
    }

    // Find the date when week 15 ends inside the current semester
    let progressEndDate = parseDate(
        currentGroup[currentGroup.length - 1].end,
        true
    );
    for (const a of currentGroup) {
        if (a.weekStart !== undefined) {
            const bStart = parseDate(a.start);
            const bEnd = parseDate(a.end, true);
            const weeksInBlock = Math.round(
                (bEnd.getTime() - bStart.getTime()) / MS_PER_WEEK
            );
            const lastWeek = a.weekStart + weeksInBlock - 1;

            if (
                a.weekStart <= SEMESTER_TEACHING_WEEKS &&
                lastWeek >= SEMESTER_TEACHING_WEEKS
            ) {
                const weeksNeeded =
                    SEMESTER_TEACHING_WEEKS - a.weekStart + 1;
                progressEndDate = new Date(
                    bStart.getTime() + weeksNeeded * MS_PER_WEEK - 1
                );
                break;
            }
        }
    }

    const progressStart = parseDate(currentGroup[0].start);
    const totalMs = progressEndDate.getTime() - progressStart.getTime();
    const elapsedMs = Math.max(
        0,
        Math.min(now.getTime() - progressStart.getTime(), totalMs)
    );
    const progressPercent = Math.min(100, (elapsedMs / totalMs) * 100);

    // ── Find current activity ────────────────────────────────────────────────
    // If today falls inside a period, use it.
    // If today is in a gap between two periods, use the upcoming one.
    // If before all periods → upcoming = first; if after all → last.
    let matched: ActivityPeriod | null = null;

    if (today < startDay) {
        matched = activities[0];
    } else if (today > endDay) {
        matched = activities[activities.length - 1];
    } else {
        // Check each activity
        for (let i = 0; i < activities.length; i++) {
            const a = activities[i];
            const aStart = startOfDay(parseDate(a.start));
            const aEnd = startOfDay(parseDate(a.end));

            if (today >= aStart && today <= aEnd) {
                matched = a;
                break;
            }

            // Gap between this activity and the next → upcoming
            if (i < activities.length - 1) {
                const nextStart = startOfDay(parseDate(activities[i + 1].start));
                if (today > aEnd && today < nextStart) {
                    matched = activities[i + 1];
                    break;
                }
            }
        }
        if (!matched) matched = activities[activities.length - 1];
    }

    const activityStart = parseDate(matched.start);
    const activityEnd = parseDate(matched.end, true);

    // ── Phase ────────────────────────────────────────────────────────────────
    let phase: Phase;
    if (today < startDay) {
        phase = "pre";
    } else if (today > endDay) {
        phase = "post";
    } else {
        phase = "active";
    }

    // ── Current week number ──────────────────────────────────────────────────
    let currentWeek: number | null = null;

    if (phase === "active" && matched.weekStart !== undefined) {
        const periodStart = startOfDay(parseDate(matched.start));
        const daysSincePeriodStart = Math.floor(
            (today.getTime() - periodStart.getTime()) / MS_PER_DAY
        );
        const weeksIn = Math.floor(daysSincePeriodStart / 7);
        currentWeek = (matched.weekStart as number) + weeksIn;
    } else if (phase === "active") {
        // Inside an exam / break — still try to find the last teaching week
        // to give context (e.g. "Post-Week 15")
        currentWeek = null;
    }

    // ── Next activity ─────────────────────────────────────────────────────────
    const matchedIndex = activities.indexOf(matched);
    const nextActivity =
        matchedIndex >= 0 && matchedIndex < activities.length - 1
            ? activities[matchedIndex + 1]
            : null;
    const nextActivityStart = nextActivity ? parseDate(nextActivity.start) : null;

    return {
        phase,
        currentActivity: matched,
        activityStart,
        activityEnd,
        nextActivity,
        nextActivityStart,
        semesterStart,
        semesterEnd,
        progressPercent,
        currentWeek,
        totalWeeks,
    };
}

// ─── Countdown formatting ─────────────────────────────────────────────────────

export function getCountdown(
    target: Date,
    now: Date = new Date()
): CountdownParts {
    const total = Math.max(0, target.getTime() - now.getTime());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, total };
}
