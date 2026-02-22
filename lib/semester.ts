import { SEMESTER_CONFIG } from "@/config/semester";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SemesterPhase = "pre" | "active" | "post";

export interface SemesterInfo {
    phase: SemesterPhase;
    /** 1-based week number (clamped to [1, totalWeeks]) */
    currentWeek: number;
    totalWeeks: number;
    progressPercent: number;
    countdownLabel: string;
    countdownTarget: Date;
    semesterStart: Date;
    semesterEnd: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip time component so comparisons are date-only */
function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Total elapsed milliseconds between two dates */
function msDiff(a: Date, b: Date): number {
    return b.getTime() - a.getTime();
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

// ─── Core Logic ──────────────────────────────────────────────────────────────

export function getSemesterInfo(now: Date = new Date()): SemesterInfo {
    const semesterStart = new Date(SEMESTER_CONFIG.SEMESTER_START + "T00:00:00");
    const semesterEnd = new Date(SEMESTER_CONFIG.SEMESTER_END + "T23:59:59");

    const totalMs = msDiff(semesterStart, semesterEnd);
    const totalWeeks = Math.round(totalMs / MS_PER_WEEK);

    const today = startOfDay(now);
    const startDay = startOfDay(semesterStart);
    const endDay = startOfDay(semesterEnd);

    let phase: SemesterPhase;
    let countdownTarget: Date;
    let countdownLabel: string;
    let currentWeek: number;
    let progressPercent: number;

    if (today < startDay) {
        // ── Pre-semester ──────────────────────────
        phase = "pre";
        countdownTarget = semesterStart;
        countdownLabel = "Semester starts in";
        currentWeek = 0;
        progressPercent = 0;
    } else if (today > endDay) {
        // ── Post-semester ─────────────────────────
        phase = "post";
        countdownTarget = semesterEnd;
        countdownLabel = "Semester ended";
        currentWeek = totalWeeks;
        progressPercent = 100;
    } else {
        // ── Active ────────────────────────────────
        phase = "active";
        countdownTarget = semesterEnd;
        countdownLabel = "Semester ends in";

        const elapsedMs = msDiff(startDay, today);
        const rawWeek = Math.floor(elapsedMs / MS_PER_WEEK) + 1;
        currentWeek = Math.min(rawWeek, totalWeeks);

        // Progress based on exact elapsed time (not week boundaries)
        const elapsedExact = msDiff(semesterStart, now);
        const totalExact = msDiff(semesterStart, semesterEnd);
        progressPercent = Math.min(100, Math.max(0, (elapsedExact / totalExact) * 100));
    }

    return {
        phase,
        currentWeek,
        totalWeeks,
        progressPercent,
        countdownLabel,
        countdownTarget,
        semesterStart,
        semesterEnd,
    };
}

// ─── Countdown formatting ─────────────────────────────────────────────────────

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number; // total milliseconds remaining
}

export function getCountdown(target: Date, now: Date = new Date()): CountdownParts {
    const total = Math.max(0, target.getTime() - now.getTime());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, total };
}
