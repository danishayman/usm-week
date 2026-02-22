"use client";

import { useEffect, useState } from "react";
import { getSemesterInfo } from "@/lib/semester";
import { SEMESTER_CONFIG } from "@/config/semester";
import ThemeToggle from "@/components/ThemeToggle";

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

// ── Status content derived from semester info ─────────────────────────────────

function getStatus() {
  const date = new Date();
  const info = getSemesterInfo(date);

  if (info.phase === "pre") {
    const daysAway = Math.ceil(
      (info.semesterStart.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      eyebrow: "Today",
      headline: `Semester starts in ${daysAway} day${daysAway !== 1 ? "s" : ""}`,
      sub: `Semester begins on ${formatShortDate(info.semesterStart)}`,
    };
  }

  if (info.phase === "post") {
    return {
      eyebrow: "Today",
      headline: "Semester ended!",
      sub: `Semester ended on ${formatShortDate(info.semesterEnd)}`,
    };
  }

  // active
  return {
    eyebrow: "Today",
    headline: `Week ${info.currentWeek} of ${info.totalWeeks}`,
    sub: `${SEMESTER_CONFIG.SEMESTER_LABEL} · ${info.progressPercent.toFixed(1)}% complete`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    // Re-evaluate at midnight so the date stays accurate
    const msToMidnight =
      new Date(new Date().setHours(24, 0, 0, 0)).getTime() - Date.now();
    const t = setTimeout(() => forceRender((n) => n + 1), msToMidnight);
    return () => clearTimeout(t);
  }, []);

  const status = getStatus();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">

      {/* Theme toggle — fixed top-right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      {/* University label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 animate-fade-up">
        Universiti Sains Malaysia
      </p>

      {/* Card */}
      <div className="card w-full max-w-md p-8 flex flex-col items-center text-center gap-5 animate-fade-up delay-100">

        {/* Date label */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Today is{" "}
          <strong className="text-slate-800 dark:text-slate-100 font-semibold">
            {formatDate(new Date())}
          </strong>
        </p>

        {/* Divider */}
        <div className="divider w-full" />

        {/* Status */}
        <div className="flex flex-col items-center gap-2 py-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
            {status.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
            {status.headline}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {status.sub}
          </p>
        </div>

      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 animate-fade-up delay-200">
        Dates configurable in{" "}
        <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          /config/semester.ts
        </code>
      </p>

    </main>
  );
}
