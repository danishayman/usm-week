import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getCountdownLabel } from "@/lib/calendar/countdown";
import {
  getCalendarCountdownTarget,
  getCalendarInfo,
  getCountdown,
  type CountdownParts,
} from "@/lib/calendar/engine";
import {
  getHeadline,
  getProgressCaption,
  getSessionLabel,
} from "@/lib/calendar/headline";
import { getCalendarForDate } from "@/lib/calendar/loader";
import {
  ACTIVITY_TYPE_METADATA,
  FALLBACK_ACTIVITY_TYPE_META,
} from "@/lib/calendar/metadata";

// The daily Discord post fetches this once, just after midnight in Kuala
// Lumpur, so it must never be served from Next's cache or the CDN -- a card
// cached from the previous evening would show yesterday's countdown. Link
// previews use app/opengraph-image.tsx, which keeps its own revalidate.
export const dynamic = "force-dynamic";

// The workflow posts this header's value (URI-encoded, since header values
// must be ASCII) as the message text, so it always matches the image.
const CAPTION_HEADER = "X-Share-Caption";

const TIME_ZONE = "Asia/Kuala_Lumpur";

// The card reproduces SemesterCard's share capture on a 412px-wide phone.
// Sizes below are the page's CSS pixels (Tailwind's mobile values), scaled up
// so the PNG stays sharp when Discord displays it.
const SCALE = 2.5;
const px = (cssPixels: number) => cssPixels * SCALE;
const FRAME_PADDING = 16;
const CARD_WIDTH = 412 - 2 * 16 - 2 * FRAME_PADDING; // viewport, page px-4, frame
const CARD_PADDING = 32;
const CARD_INNER_WIDTH = CARD_WIDTH - 2 * CARD_PADDING;

// Tailwind's line heights for the text sizes the card uses.
const LINE_HEIGHT = {
  xs: 16,
  sm: 20,
  lg: 28,
  "2xl": 32,
  "3xlTight": 37.5, // text-3xl leading-tight
  "4xlNone": 36, // text-4xl leading-none
};

// Average advance per character, in CSS px, including letter spacing, for
// estimating where text wraps. Geist Mono is monospaced at 0.6em; the Inter
// figures were measured from rendered cards.
const CHAR_WIDTH = {
  date: 14 * 0.6,
  eyebrow: 12.2,
  headline: 14.1,
  countdownLabel: 12 * 0.6 + 12 * 0.1,
};
const DATE_LEAD_WIDTH = 56; // "Today is " in Inter

function lineCount(width: number): number {
  // Words wrap before the box is full, so later lines hold a little less.
  return width <= CARD_INNER_WIDTH
    ? 1
    : Math.ceil(width / (CARD_INNER_WIDTH * 0.85));
}

const SLATE_300 = "#cbd5e1";
const SLATE_400 = "#94a3b8";
const SLATE_500 = "#64748b";
const SLATE_800 = "#1e293b";
const SLATE_900 = "#0f172a";
const GRAY_200 = "#e5e7eb";

// Tailwind colours behind the accentTextClass values SemesterCard applies to
// the eyebrow.
const ACCENT_TEXT_COLORS: Record<string, string> = {
  "text-purple-950": "#3b0764",
  "text-purple-800": "#6b21a8",
};

const SANS = "Inter";
const MONO = "Geist Mono";

type FontWeight = 300 | 400 | 600 | 700 | 800;
interface FontOption {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
}

const FONT_FACES: [string, FontWeight][] = [
  [SANS, 300],
  [SANS, 400],
  [SANS, 600],
  [SANS, 700],
  [SANS, 800],
  [MONO, 400],
  [MONO, 600],
  [MONO, 700],
];

async function loadGoogleFont(
  family: string,
  weight: FontWeight
): Promise<FontOption> {
  // Without a browser user agent the CSS API answers with TrueType files,
  // which Satori can read (it cannot read the woff2 files the page uses).
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}`;
  const css = await (await fetch(cssUrl)).text();
  const fontUrl = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/
  )?.[1];
  if (!fontUrl) throw new Error(`No TrueType source for ${family} ${weight}`);

  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${fontUrl}`);
  return {
    name: family,
    data: await response.arrayBuffer(),
    weight,
    style: "normal",
  };
}

// Kept per server instance. If Google Fonts is unreachable the card falls back
// to next/og's built-in font rather than failing the daily post, and the next
// request tries again.
let fontsPromise: Promise<FontOption[]> | null = null;

function loadFonts(): Promise<FontOption[]> {
  fontsPromise ??= Promise.all(
    FONT_FACES.map(([family, weight]) => loadGoogleFont(family, weight))
  ).catch((error) => {
    console.error("discord-image: could not load fonts", error);
    fontsPromise = null;
    return [];
  });
  return fontsPromise;
}

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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-MY", {
    timeZone: TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: px(1),
        backgroundColor: GRAY_200,
      }}
    />
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// SemesterCard's CountdownUnit, Separator and LiveCountdown.
function CountdownUnit({
  value,
  unit,
  colour,
}: {
  value: number;
  unit: string;
  colour: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: px(52),
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: MONO,
          fontSize: px(36),
          fontWeight: 700,
          lineHeight: 1,
          color: colour,
        }}
      >
        {pad(value)}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: px(6),
          fontSize: px(12),
          lineHeight: `${px(LINE_HEIGHT.xs)}px`,
          fontWeight: 600,
          letterSpacing: px(12 * 0.05),
          color: SLATE_400,
        }}
      >
        {unit.toUpperCase()}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: px(20),
        fontSize: px(24),
        fontWeight: 300,
        lineHeight: `${px(LINE_HEIGHT["2xl"])}px`,
        color: SLATE_300,
      }}
    >
      :
    </div>
  );
}

function Countdown({
  parts,
  colour,
}: {
  parts: CountdownParts;
  colour: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: px(12),
      }}
    >
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

// In development, ?at=<ISO date> previews the card for another day, e.g.
// /discord-image?at=2027-07-20 for the long break. Production ignores it.
function resolveNow(request: Request): Date {
  if (process.env.NODE_ENV === "development") {
    const at = new URL(request.url).searchParams.get("at");
    const parsed = at ? new Date(at) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export async function GET(request: Request) {
  const now = resolveNow(request);
  const calendar = getCalendarForDate(now);
  const info = getCalendarInfo(calendar, now);

  const isPre = info.phase === "pre";
  const isPost = info.phase === "post";
  const activityMeta =
    ACTIVITY_TYPE_METADATA[info.currentPeriod.type] ??
    FALLBACK_ACTIVITY_TYPE_META;
  const accentText =
    ACCENT_TEXT_COLORS[activityMeta.accentTextClass] ??
    ACCENT_TEXT_COLORS["text-purple-950"];
  const accentHex = activityMeta.countdownColor;

  // Mirrors SemesterCard's derived display values.
  const headlineActivity = isPre
    ? "Semester hasn't started yet"
    : isPost
      ? "Semester Complete"
      : info.currentPeriod.label;
  const headline = getHeadline(info);
  const session = getSessionLabel(info.termLabel, calendar.academicYear);
  const percent = Math.max(0, Math.min(100, info.progressPercent));
  const progressCaption = getProgressCaption(info, calendar.academicYear);
  const subLine = isPre || isPost ? session : progressCaption;
  const countdownLabel = getCountdownLabel(calendar, info);
  const countdown = getCountdown(getCalendarCountdownTarget(calendar, info), now);

  const [fonts, crestSrc] = await Promise.all([loadFonts(), loadCrest()]);

  const todayLabel = formatDate(now);
  const showProgress = !isPre && !isPost;
  const showCountdown = !isPost;

  // Satori needs a fixed height, so it is added up from the layout below (CSS
  // px), estimating where text wraps, to keep the frame hugging the card as
  // the capture does. Content is centred, so a small error splits evenly
  // above and below.
  const dateLines = lineCount(
    DATE_LEAD_WIDTH + todayLabel.length * CHAR_WIDTH.date
  );
  const labelBlock = 112 + 8 + LINE_HEIGHT.xs + 24;
  const activityBlock =
    4 +
    LINE_HEIGHT.lg * lineCount(headlineActivity.length * CHAR_WIDTH.eyebrow) +
    8 +
    LINE_HEIGHT["3xlTight"] * lineCount(headline.length * CHAR_WIDTH.headline) +
    (showProgress ? 8 + 4 + 22 + 2 * 3 : 0) +
    8 +
    LINE_HEIGHT.xs +
    4;
  const countdownBlock =
    8 +
    LINE_HEIGHT.xs *
      lineCount(countdownLabel.length * CHAR_WIDTH.countdownLabel) +
    (showCountdown ? 20 + LINE_HEIGHT["4xlNone"] + 6 + LINE_HEIGHT.xs : 0) +
    8;
  const divider = 20 + 1 + 20;
  const card =
    2 * 1 +
    2 * CARD_PADDING +
    LINE_HEIGHT.sm * dateLines +
    divider +
    activityBlock +
    divider +
    countdownBlock;
  const cssHeight = 2 * FRAME_PADDING + labelBlock + card;

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
          padding: px(FRAME_PADDING),
          borderRadius: px(20),
          backgroundImage:
            "linear-gradient(160deg, #f6f3ff 0%, #e6deff 50%, #d4c6ff 100%)",
          fontFamily: SANS,
          color: "#111827",
        }}
      >
        {/* University label */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: px(8),
            marginBottom: px(24),
          }}
        >
          {crestSrc ? (
            // The 192px icon is maskable, so it carries an opaque square
            // background -- round it off to match the page's circular crest.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={crestSrc}
              width={px(112)}
              height={px(112)}
              alt=""
              style={{ borderRadius: 999 }}
            />
          ) : (
            <div style={{ display: "flex", height: px(112) }} />
          )}
          <div
            style={{
              display: "flex",
              fontSize: px(12),
              lineHeight: `${px(LINE_HEIGHT.xs)}px`,
              fontWeight: 600,
              letterSpacing: px(12 * 0.1),
              color: SLATE_800,
            }}
          >
            UNIVERSITI SAINS MALAYSIA
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: px(CARD_WIDTH),
            padding: px(CARD_PADDING),
            gap: px(20),
            backgroundColor: "#ffffff",
            border: `${px(1)}px solid ${GRAY_200}`,
            borderRadius: px(12),
          }}
        >
          {/* Date */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              fontSize: px(14),
              lineHeight: `${px(LINE_HEIGHT.sm)}px`,
              color: SLATE_500,
              textAlign: "center",
            }}
          >
            <span>Today is&nbsp;</span>
            <span
              style={{ fontFamily: MONO, fontWeight: 600, color: SLATE_800 }}
            >
              {todayLabel}
            </span>
          </div>

          <Divider />

          {/* Current activity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: px(8),
              padding: `${px(4)}px 0`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: px(18),
                lineHeight: `${px(LINE_HEIGHT.lg)}px`,
                fontWeight: 700,
                letterSpacing: px(18 * 0.1),
                justifyContent: "center",
                textAlign: "center",
                color: accentText,
              }}
            >
              {headlineActivity.toUpperCase()}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: px(30),
                fontWeight: 800,
                lineHeight: `${px(LINE_HEIGHT["3xlTight"])}px`,
                letterSpacing: px(30 * -0.025),
                justifyContent: "center",
                textAlign: "center",
                color: SLATE_900,
              }}
            >
              {headline}
            </div>

            {/* Retro progress bar */}
            {showProgress && (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  marginTop: px(4),
                  backgroundColor: "#000000",
                  border: `${px(3)}px solid #000000`,
                  borderRadius: 999,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: `${percent}%`,
                    height: px(22),
                    backgroundColor: "#00ff00",
                    borderRadius: 999,
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: px(12),
                lineHeight: `${px(LINE_HEIGHT.xs)}px`,
                color: SLATE_500,
                textAlign: "center",
                // whitespace-nowrap on the page
                whiteSpace: "nowrap",
              }}
            >
              {subLine}
            </div>
          </div>

          <Divider />

          {/* Countdown, as it stands at the moment the card is rendered */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: px(20),
              padding: `${px(8)}px 0`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: MONO,
                fontSize: px(12),
                lineHeight: `${px(LINE_HEIGHT.xs)}px`,
                fontWeight: 600,
                justifyContent: "center",
                letterSpacing: px(12 * 0.1),
                color: SLATE_400,
                textAlign: "center",
              }}
            >
              {countdownLabel.toUpperCase()}
            </div>

            {showCountdown && <Countdown parts={countdown} colour={accentHex} />}
          </div>
        </div>
      </div>
    ),
    {
      width: px(CARD_WIDTH + FRAME_PADDING * 2),
      height: px(cssHeight),
      fonts,
      headers: {
        // ImageResponse defaults to a year-long immutable cache header.
        "Cache-Control": "no-store, max-age=0",
        [CAPTION_HEADER]: encodeURIComponent(progressCaption),
      },
    }
  );
}
