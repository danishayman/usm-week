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
const SHARE_URL = "https://usm-week.netlify.app/";

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
  const [isCaptureMode, setIsCaptureMode] = useState(false);
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
      setIsCaptureMode(true);

      if (document.fonts?.status !== "loaded") {
        await document.fonts?.ready;
      }

      // Let React commit capture-only layout before snapshotting.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (node) =>
          !(
            node instanceof HTMLElement &&
            node.dataset.noCapture === "true"
          ),
      });
      const blob = await (await fetch(dataUrl)).blob();
      const imageFile = new File([blob], filename, { type: "image/png" });

      if (typeof navigator.share === "function") {
        const shareCaptionText = `${captureCaptionLine}\n${SHARE_URL}`;
        const shareData: ShareData = {
          title: "USM Week Snapshot",
          text: shareCaptionText,
          files: [imageFile],
        };
        const canShareFiles =
          typeof navigator.canShare !== "function" ||
          navigator.canShare({ files: [imageFile] });

        if (canShareFiles) {
          try {
            await navigator.share(shareData);
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
      setIsCaptureMode(false);
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
  const formattedProgressPercent = Number.isInteger(progressPercent)
    ? progressPercent.toFixed(0)
    : progressPercent.toFixed(1);

  const subLine = (() => {
    if (isPre || isPost) return semesterProgressLabel;
    return `${semesterProgressLabel} is ${formattedProgressPercent}% complete.`;
  })();

  const captureCaptionLine = (() => {
    if (isPre || isPost) return semesterProgressLabel;
    return `${semesterProgressLabel} is ${formattedProgressPercent}% complete.`;
  })();

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-4">
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        className="absolute top-0 right-0 z-50 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        aria-label="Share this week snapshot as image"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 250 250"
          className="block"
          aria-hidden="true"
        >
          <path d="M0,0 L250,0 L250,250 Z" fill="#151513" />
        </svg>
        <span className="pointer-events-none absolute top-3 right-3 flex h-7 w-7 items-center justify-center text-white">
          {isSharing ? (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeOpacity="0.25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 corner-share-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M16 8L8 12L16 16"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          )}
        </span>
      </button>

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

          {isCaptureMode ? null : (
            <>
              <div data-no-capture="true" className="divider w-full" />
              <div
                data-no-capture="true"
                className="w-full flex flex-col items-center gap-3 pt-1 pb-0.5"
              >
                <div className="inline-flex flex-col items-stretch">
                  <a
                    href="https://bpa.usm.my/index.php/kalendar-akademik"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center font-sans text-sm font-semibold text-sky-700 underline decoration-2 underline-offset-4 transition-colors hover:text-sky-900 hover:decoration-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded-sm"
                    aria-label="View USM Academic Calendar"
                  >
                    USM Academic Calendar
                  </a>
                </div>
              </div>
            </>
          )}

          {shareFeedback && (
            <p data-no-capture="true" className="font-sans text-xs text-slate-500">
              {shareFeedback}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
