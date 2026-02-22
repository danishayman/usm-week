"use client";

import { useEffect, useState } from "react";
import { getSemesterInfo, getCountdown, type CountdownParts } from "@/lib/semester";
import { SEMESTER_CONFIG } from "@/config/semester";


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-MY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ── Activity type → accent colour ─────────────────────────────────────────────

const ACTIVITY_COLOURS: Record<string, string> = {
  teaching: "text-indigo-600",
  revision: "text-amber-600",
  exam: "text-rose-600",
  break: "text-emerald-600",
  industrial: "text-sky-600",
};

const COUNTDOWN_COLOUR: Record<string, string> = {
  teaching: "#4f46e5",
  revision: "#d97706",
  exam: "#e11d48",
  break: "#059669",
  industrial: "#0284c7",
};

// ── Countdown display ─────────────────────────────────────────────────────────

function CountdownUnit({ value, unit, colour }: { value: number; unit: string; colour: string }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span
        className="text-4xl sm:text-5xl font-bold tabular-nums leading-none"
        style={{ color: colour }}
      >
        {pad(value)}
      </span>
      <span className="text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
        {unit}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="text-2xl font-light text-slate-300 mb-5 select-none">
      :
    </span>
  );
}

function LiveCountdown({ parts, colour }: { parts: CountdownParts; colour: string }) {
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      <CountdownUnit value={parts.days} unit="days" colour={colour} />
      <Separator />
      <CountdownUnit value={parts.hours} unit="hrs" colour={colour} />
      <Separator />
      <CountdownUnit value={parts.minutes} unit="min" colour={colour} />
      <Separator />
      <CountdownUnit value={parts.seconds} unit="sec" colour={colour} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [now, setNow] = useState<Date>(() => new Date());

  // Tick every second for the live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const info = getSemesterInfo(now);
  const countdown = getCountdown(info.activityEnd, now);

  const activityType = info.currentActivity.type as string;
  const accentText = ACTIVITY_COLOURS[activityType] ?? "text-indigo-500";
  const accentHex = COUNTDOWN_COLOUR[activityType] ?? "#4f46e5";

  // Derived display values
  const isPost = info.phase === "post";
  const isPre = info.phase === "pre";

  const headlineActivity = (() => {
    if (isPre) return "Semester hasn't started yet";
    if (isPost) return "Semester Complete 🎓";
    return info.currentActivity.label;
  })();

  const countdownLabel = (() => {
    if (isPre) return `Semester begins on ${formatShortDate(info.semesterStart)}`;
    if (isPost) return `Ended on ${formatShortDate(info.semesterEnd)}`;
    return `${info.currentActivity.label} ends in`;
  })();

  const weekBadge = (() => {
    if (info.currentWeek !== null) return `Week ${info.currentWeek}`;
    return null;
  })();

  const subLine = (() => {
    if (isPre || isPost) return SEMESTER_CONFIG.SEMESTER_LABEL;
    return `${SEMESTER_CONFIG.SEMESTER_LABEL} · ${info.progressPercent.toFixed(1)}% complete`;
  })();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">


      {/* University label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 animate-fade-up">
        Universiti Sains Malaysia
      </p>

      {/* Card */}
      <div className="card w-full max-w-md p-8 flex flex-col items-center text-center gap-5 animate-fade-up delay-100">

        {/* Date */}
        <p className="text-sm text-slate-500">
          Today is{" "}
          <strong className="text-slate-800 font-semibold">
            {formatDate(now)}
          </strong>
        </p>

        <div className="divider w-full" />

        {/* Current activity */}
        <div className="flex flex-col items-center gap-2 py-1 w-full">

          {/* Week badge (shown only during tracked weeks) */}
          {weekBadge && (
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-1"
              style={{
                color: accentHex,
                background: accentHex + "18",
              }}
            >
              {weekBadge}
            </span>
          )}

          {/* Activity label eyebrow */}
          <p className={`text-xs font-semibold uppercase tracking-widest ${accentText}`}>
            Currently
          </p>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {headlineActivity}
          </h1>

          {/* Sub-line */}
          <p className="text-sm text-slate-500">
            {subLine}
          </p>
        </div>

        {/* Countdown */}
        {!isPost && (
          <>
            <div className="divider w-full" />
            <div className="flex flex-col items-center gap-4 w-full py-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {countdownLabel}
              </p>
              <LiveCountdown parts={countdown} colour={accentHex} />
            </div>
          </>
        )}

        {isPost && (
          <>
            <div className="divider w-full" />
            <p className="text-sm text-slate-400">
              {countdownLabel}
            </p>
          </>
        )}

      </div>
    </main>
  );
}
