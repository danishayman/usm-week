# USM Week

USM Week is a web app that tracks the current academic period for Universiti Sains Malaysia, including the active week, semester progress, and a live countdown to the next milestone.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Zod (calendar validation)
- Vitest (tests)

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run tests once
npm run test:watch # Run tests in watch mode
```

## Calendar Data

Calendar data is stored in JSON files under `data/calendars/`.

Current files:

- `data/calendars/usm-2025-2026.json`
- `data/calendars/usm-2026-2027.json`

The app picks the calendar that covers the current date, so it moves to the
next academic year on its own with no redeploy. Between two sessions it keeps
showing the one that just ended.

To add a future academic year:

1. Add `data/calendars/usm-<start>-<end>.json`, matching an existing file.
2. Register it in the `CALENDAR_REGISTRY` map in `lib/calendar/loader.ts`.
3. Run `npm run test` to validate schema and calendar logic.
4. Start the app with `npm run dev` and verify the UI output.

When updating dates in an existing file, edit it and run steps 3 and 4.

## Daily Discord Card

Every day just after 12:00am Malaysia time, a GitHub Actions workflow posts a
card to one or more Discord channels. The card looks like the page's share
image on a phone: the current week, semester progress, and the countdown to
the next milestone.

### The image route

`/discord-image` (`app/discord-image/route.tsx`) renders the card on the
server as a portrait PNG laid out like the page on a 412px-wide phone, using
the page's Inter and Geist Mono fonts from Google Fonts. It is rendered fresh
on every request (`no-store`), so it always shows the current values. The
countdown shows days, hours, minutes and seconds as they stood when the card
was rendered. Preview it locally at
[http://localhost:3000/discord-image](http://localhost:3000/discord-image).
Under `npm run dev` only, add `?at=<date>` to preview another day, for example
`/discord-image?at=2027-07-20`.

The page and the card share their wording: `getCountdownLabel` in
`lib/calendar/countdown.ts` and `getProgressCaption` in
`lib/calendar/headline.ts`. The route also returns the caption (for example
"Semester I 2026/2027 is 24.66% complete.") in an `X-Share-Caption` header.

### The workflow

`.github/workflows/discord-daily-card.yml` runs on the cron `0 16 * * *`.
GitHub Actions cron is in UTC, and 16:00 UTC is 12:00am in Kuala Lumpur
(UTC+8) on the following day. Scheduled runs are best-effort and often start
several minutes late.

The workflow downloads the card from https://usm-week.netlify.app and uploads
it to each webhook as a file attachment. The message text is the same as the
page's share text: the caption from `X-Share-Caption`, then the site link. It does not send a link, because Discord caches
link previews and would keep showing an old card. It fails if the card can't be
downloaded or isn't a valid PNG. If one webhook fails, for example because it
was deleted, the others still get the card, and the run is marked as failed so
you get notified.

The workflow fetches the production site, so deploy the route before you rely
on it.

### Setup

1. In each Discord server, open the channel's **Settings → Integrations →
   Webhooks → New Webhook**, then **Copy Webhook URL**. This needs the
   **Manage Webhooks** permission in that channel. For someone else's server,
   ask them to create the webhook and send you the URL privately.
2. In GitHub, go to **Settings → Secrets and variables → Actions → New
   repository secret** and add `DISCORD_WEBHOOK_URLS`, with one webhook URL per
   line. Blank lines and lines starting with `#` are ignored, so you can label
   each server:

   ```text
   # My server
   https://discord.com/api/webhooks/...
   # Friend's server
   https://discord.com/api/webhooks/...
   ```

   Anyone with a webhook URL can post to that channel, so never commit one. To
   add a server, update the secret with the full list. GitHub doesn't show a
   secret's current value, so keep your own copy of the list.
3. To test, open **Actions → Discord daily card → Run workflow**. You can
   optionally point it at a different card URL, such as a preview deployment.

To stop posting to a server, delete its line from the secret, or delete the
webhook in Discord. GitHub disables scheduled workflows in public repositories
after 60 days with no commits, so re-enable it from the Actions tab if the
posts stop.

## Deployment

Standard production flow:

```bash
npm run build
npm run start
```
