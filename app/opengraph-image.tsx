import { readFile } from "node:fs/promises";

import { ImageResponse } from "next/og";

import { getCalendarInfo } from "@/lib/calendar/engine";
import { getHeadline, getSessionLabel } from "@/lib/calendar/headline";
import { getCalendarForDate } from "@/lib/calendar/loader";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — the current USM academic week`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Matches the page: the week only changes daily, so cached previews stay right.
export const revalidate = 300;

// Satori draws from a decoded bitmap, so this is the 192px icon rather than
// public/usm.png (2500x2500, 581 KB). Read relative to this module so the file
// is traced into the serverless bundle.
async function loadCrest(): Promise<string> {
  const crest = await readFile(new URL("./crest.png", import.meta.url));
  return `data:image/png;base64,${crest.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const now = new Date();
  const calendar = getCalendarForDate(now);
  const info = getCalendarInfo(calendar, now);

  const headline = getHeadline(info);
  const session = getSessionLabel(info.termLabel, calendar.academicYear);
  const percent = Math.max(0, Math.min(100, info.progressPercent));
  const crestSrc = await loadCrest();

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
        {/* The 192px icon is maskable, so it carries an opaque square
            background -- round it off to match the page's circular crest. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={crestSrc}
          width={150}
          height={150}
          alt=""
          style={{ borderRadius: 999 }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            color: "#334155",
            marginTop: 20,
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
            marginTop: 34,
          }}
        >
          {info.currentPeriod.label.toUpperCase()}
        </div>

        <div style={{ display: "flex", fontSize: 128, marginTop: 6 }}>
          {headline}
        </div>

        <div
          style={{
            display: "flex",
            width: 820,
            height: 26,
            marginTop: 34,
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

        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#475569",
            marginTop: 24,
          }}
        >
          {`${session} — ${percent.toFixed(1)}% complete`}
        </div>
      </div>
    ),
    size
  );
}
