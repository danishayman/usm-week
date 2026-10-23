import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getDailyCountdownLine } from "@/lib/calendar/countdown";
import { getCalendarInfo } from "@/lib/calendar/engine";
import { getHeadline, getSessionLabel } from "@/lib/calendar/headline";
import { getCalendarForDate } from "@/lib/calendar/loader";
import {
  ACTIVITY_TYPE_METADATA,
  FALLBACK_ACTIVITY_TYPE_META,
} from "@/lib/calendar/metadata";

const size = { width: 1200, height: 675 };

// The daily Discord post fetches this once, just after midnight in Kuala
// Lumpur, so it must never be served from Next's cache or the CDN -- a card
// cached from the previous evening would show yesterday's countdown. Link
// previews use app/opengraph-image.tsx, which keeps its own revalidate.
export const dynamic = "force-dynamic";

// Same 192px icon as the Open Graph image. Unlike that image, this route runs
// on every request, so the file is read at runtime from a process.cwd() path,
// the form Next's file tracing includes in the serverless bundle. A missing
// crest drops the logo rather than failing the whole daily post.
async function loadCrest(): Promise<string | null> {
  try {
    const crest = await readFile(join(process.cwd(), "app", "crest.png"));
    return `data:image/png;base64,${crest.toString("base64")}`;
  } catch (error) {
    console.error("discord-image: could not read the crest", error);
    return null;
  }
}

export async function GET() {
  const now = new Date();
  const calendar = getCalendarForDate(now);
  const info = getCalendarInfo(calendar, now);

  const isPre = info.phase === "pre";
  const isPost = info.phase === "post";
  const headline = getHeadline(info);
  const session = getSessionLabel(info.termLabel, calendar.academicYear);
  const percent = Math.max(0, Math.min(100, info.progressPercent));
  const countdownLine = getDailyCountdownLine(calendar, info, now);
  const accent = (
    ACTIVITY_TYPE_METADATA[info.currentPeriod.type] ??
    FALLBACK_ACTIVITY_TYPE_META
  ).countdownColor;
  const crestSrc = await loadCrest();

  // As on the page, the pre and post phases replace the period label and drop
  // the progress bar, which would otherwise sit at a meaningless 0% or 100%.
  const periodLabel = isPre
    ? "Semester hasn't started yet"
    : isPost
      ? "Semester complete"
      : info.currentPeriod.label;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(160deg, #f6f3ff 0%, #e6deff 50%, #d4c6ff 100%)",
          color: "#0f172a",
        }}
      >
        {crestSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={crestSrc}
            width={130}
            height={130}
            alt=""
            style={{ borderRadius: 999 }}
          />
        )}

        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 6,
            color: "#334155",
            marginTop: 16,
          }}
        >
          UNIVERSITI SAINS MALAYSIA
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 34,
            letterSpacing: 4,
            color: "#501f7d",
            marginTop: 28,
          }}
        >
          {periodLabel.toUpperCase()}
        </div>

        <div style={{ display: "flex", fontSize: 120, marginTop: 4 }}>
          {headline}
        </div>

        {!isPre && !isPost && (
          <div
            style={{
              display: "flex",
              width: 820,
              height: 26,
              marginTop: 26,
              borderRadius: 999,
              border: "5px solid #000000",
              backgroundColor: "#000000",
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${percent}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: "#00ff00",
              }}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#475569",
            marginTop: 20,
          }}
        >
          {isPre || isPost
            ? session
            : `${session} — ${percent.toFixed(1)}% complete`}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 38,
            color: accent,
            marginTop: 30,
            padding: "12px 34px",
            borderRadius: 999,
            backgroundColor: "rgba(255, 255, 255, 0.6)",
          }}
        >
          {countdownLine}
        </div>
      </div>
    ),
    {
      ...size,
      // ImageResponse defaults to a year-long immutable cache header.
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
