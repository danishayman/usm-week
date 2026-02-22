import { SEMESTER_CONFIG, type ActivityPeriod } from "@/config/semester";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Phase = "pre" | "active" | "post";

export interface SemesterInfo {
    phase: Phase;
    /** The currently active (or most-recently-ended) activity */
    currentActivity: ActivityPeriod;
    /** Start of the current activity period */
    activityStart: Date;
    /** End of the current activity period — countdown target */
    activityEnd: Date;
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

    // ── Overall progress ─────────────────────────────────────────────────────
    const totalMs = semesterEnd.getTime() - semesterStart.getTime();
    const elapsedMs = Math.max(
        0,
        Math.min(now.getTime() - semesterStart.getTime(), totalMs)
    );
    const progressPercent = (elapsedMs / totalMs) * 100;

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

    return {
        phase,
        currentActivity: matched,
        activityStart,
        activityEnd,
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
