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

## Deployment

Standard production flow:

```bash
npm run build
npm run start
```
