"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import {
  ACTIVITY_TYPE_METADATA,
  FALLBACK_ACTIVITY_TYPE_META,
  getCalendarCountdownTarget,
  getCalendarInfo,
  getCountdown,
  getDefaultCalendar,
  type CountdownParts,
} from "@/lib/semester";


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

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isShareAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

const CALENDAR = getDefaultCalendar();

// ── Countdown display ─────────────────────────────────────────────────────────

function CountdownUnit({ value, unit, colour }: { value: number; unit: string; colour: string }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span
        className="font-mono text-4xl sm:text-5xl font-bold tabular-nums leading-none"
        style={{ color: colour }}
      >
        {pad(value)}
      </span>
      <span className="font-sans text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
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
  const [now, setNow] = useState<Date | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!captureRef.current || isSharing || !now) return;

    setIsSharing(true);
    setShareFeedback(null);

    const filename = `usm-week-${formatDateKey(now)}.png`;

    try {
      if (document.fonts?.status !== "loaded") {
        await document.fonts?.ready;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const imageFile = new File([blob], filename, { type: "image/png" });

      if (typeof navigator.share === "function") {
        const shareData: ShareData = {
          title: "USM Week Snapshot",
          text: `USM week snapshot for ${formatShortDate(now)}`,
          files: [imageFile],
        };
        const canShareFiles =
          typeof navigator.canShare !== "function" ||
          navigator.canShare({ files: [imageFile] });

        if (canShareFiles) {
          try {
            await navigator.share(shareData);
            setShareFeedback("Shared successfully.");
            return;
          } catch (error) {
            if (isShareAbortError(error)) return;
          }
        }
      }

      triggerDownload(blob, filename);
      setShareFeedback("Sharing not supported here, so the image was downloaded.");
    } catch {
      setShareFeedback("Couldn't generate the image. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  // Only start ticking after mount to avoid hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render nothing until mounted on client
  if (!now) return null;

  const info = getCalendarInfo(CALENDAR, now);
  const countdownTarget = getCalendarCountdownTarget(CALENDAR, info);
  const countdown = getCountdown(countdownTarget, now);

  const activityType = info.currentPeriod.type;
  const activityMeta =
    ACTIVITY_TYPE_METADATA[activityType] ?? FALLBACK_ACTIVITY_TYPE_META;
  const accentText = activityMeta.accentTextClass;
  const accentHex = activityMeta.countdownColor;

  // Derived display values
  const isPost = info.phase === "post";
  const isPre = info.phase === "pre";

  const headlineActivity = (() => {
    if (isPre) return "Semester hasn't started yet";
    if (isPost) return "Semester Complete 🎓";
    return info.currentPeriod.label;
  })();

  const countdownLabel = (() => {
    if (isPre) return `Semester begins on ${formatShortDate(info.calendarStart)}`;
    if (isPost) return `Ended on ${formatShortDate(info.calendarEnd)}`;
    if (info.nextPeriod) return `${info.nextPeriod.label} starts in`;
    if (CALENDAR.nextAcademicYearStart) return "Next academic year starts in";
    return `${info.currentPeriod.label} ends in`;
  })();

  const weekBadge = (() => {
    if (info.currentWeek !== null) return `Week ${info.currentWeek}`;
    return null;
  })();

  const sessionLabel = CALENDAR.academicYear.replace("-", "/");
  const semesterProgressLabel =
    sessionLabel && !info.termLabel.includes(sessionLabel)
      ? `${info.termLabel} ${sessionLabel}`
      : info.termLabel;
  const progressPercent = Math.max(0, Math.min(100, info.progressPercent));

  const subLine = (() => {
    if (isPre || isPost) return semesterProgressLabel;
    return `${semesterProgressLabel} is ${Number.isInteger(progressPercent) ? progressPercent.toFixed(0) : progressPercent.toFixed(1)}% complete.`;
  })();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-4">

      {/* GitHub corner */}
      <a
        href="https://github.com/danishayman/usm-week"
        target="_blank"
        rel="noopener noreferrer"
        className="github-corner absolute top-0 left-0 z-50"
        aria-label="View source on GitHub"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 250 250"
          style={{
            fill: "#151513",
            color: "#fff",
            transform: "scaleX(-1)",
          }}
        >
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
          <path
            d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
            fill="currentColor"
            style={{ transformOrigin: "130px 106px" }}
            className="octo-arm"
          />
          <path
            d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.3,141.5 141.4,141.4 Z"
            fill="currentColor"
            className="octo-body"
          />
        </svg>
      </a>

      <div ref={captureRef} className="w-full max-w-md">
        {/* University label */}
        <div className="flex flex-col items-center gap-2 mb-6 animate-fade-up">
          <Image
            src="/usm.png"
            alt="Universiti Sains Malaysia Logo"
            width={112}
            height={112}
            className="object-contain"
            priority
          />
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-800">
            Universiti Sains Malaysia
          </p>
        </div>

        {/* Card */}
        <div className="card w-full p-8 flex flex-col items-center text-center gap-5 animate-fade-up delay-100">

          {/* Date */}
          <p className="font-sans text-sm text-slate-500">
            Today is{" "}
            <strong className="font-mono text-slate-800 font-semibold">
              {formatDate(now)}
            </strong>
          </p>

          <div className="divider w-full" />

          {/* Current activity */}
          <div className="flex flex-col items-center gap-2 py-1 w-full">

            {/* Current week / activity eyebrow */}
            <p
              className={`font-sans text-lg sm:text-xl font-bold uppercase tracking-widest ${accentText}`}
            >
              {headlineActivity}
            </p>

            {/* Headline */}
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
              {weekBadge ?? "Currently"}
            </h1>

            {/* Retro progress bar */}
            {!isPre && !isPost && (
              <div className="w-full mt-1">
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{
                    background: "#000",
                    border: "3px solid #000",
                    borderRadius: "999px",
                  }}
                >
                  <div
                    suppressHydrationWarning
                    style={{
                      width: `${progressPercent}%`,
                      background: "#00ff00",
                      height: "22px",
                      borderRadius: "999px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sub-line */}
            <p className="font-mono text-xs sm:text-sm text-slate-500 whitespace-nowrap">
              {subLine}
            </p>
          </div>

          {/* Countdown */}
          {!isPost && (
            <>
              <div className="divider w-full" />
              <div className="flex flex-col items-center gap-5 w-full py-2">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
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

          <div className="divider w-full" />
          <div className="w-full flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:items-center">
            <a
              href="https://bpa.usm.my/index.php/kalendar-akademik"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm font-semibold text-sky-700 underline decoration-2 underline-offset-4 transition-colors hover:text-sky-900 hover:decoration-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded-sm"
              aria-label="View USM Academic Calendar"
            >
              USM Academic Calendar
            </a>
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="font-sans text-sm font-semibold px-3 py-1.5 rounded-md bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              aria-label="Share this week snapshot as image"
            >
              {isSharing ? "Preparing image..." : "Share as image"}
            </button>
          </div>

          {shareFeedback && (
            <p className="font-sans text-xs text-slate-500">
              {shareFeedback}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
