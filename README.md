# studylog

A daily photograph of how you showed up to study — with streaks, a focus-quality heatmap, and a private, signed-URL photo store. Built with React + vanilla CSS, Supabase, and installable as a PWA.

---

## What this is

Not a generic gallery-with-dates. The core loop is: **take a photo of your study session → rate your focus → log hours → build a streak you can actually trust.** The photo is evidence, not decoration.

### Features

- **Camera-first capture** — live `getUserMedia` shutter (front/back camera switch), with file-picker fallback for devices without camera access.
- **Contact sheet streak strip** — the signature visual: recent days rendered like a strip of film negatives, sprocket holes and all, tinted by that day's focus score.
- **Focus heatmap** — GitHub-style grid, but colored by self-rated focus quality (1–5), not mere presence. Answers "was I focused," not just "did I show up."
- **Streak engine with grace days** — one freeze available after a missed day so a single bad day doesn't erase your momentum. Longest-streak tracking accounts for frozen gaps.
- **Auto-generated weekly retrospective** — best/worst day, trend direction, total hours — computed client-side from your own data, no LLM call needed.
- **Day comparison view** — pick any two days and view their photos side by side.
- **Offline queueing** — if you capture a photo with no connection, it's held in IndexedDB and uploaded automatically the moment you're back online.
- **Privacy by construction** — private Supabase Storage bucket, Row Level Security on every table, photos served only via signed URLs that expire in 10 minutes. No public bucket, ever.
- **Installable PWA** — add-to-home-screen on iOS/Android/desktop, app-shell asset caching (never caches photos or API responses).

---

## Tech stack

- **React 19 + Vite** — no framework router needed; the app is a single auth-gated view.
- **Vanilla CSS** — hand-written design tokens (`src/styles/tokens.css`), no Tailwind, no CSS framework.
- **Supabase** — Postgres (with RLS), Auth, and Storage.
- **vite-plugin-pwa** — manifest + service worker generation.

---

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a project, and grab your **Project URL** and **anon public key** from Project Settings → API.

### 2. Run the schema
Open the SQL Editor in your Supabase dashboard and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates:
- `entries` table (one row per study day, RLS-protected)
- `streak_freezes` table (tracks grace-day usage)
- the **private** `study-photos` storage bucket
- storage policies that only allow a user to read/write/delete objects under their own `{user_id}/` folder

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Install and run
```bash
npm install
npm run dev
```

### 5. Build for production
```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, your own server). The PWA service worker and manifest are generated automatically at build time.

---

## Security model

- **No public photo URLs.** The storage bucket is created with `public: false`. Every photo render in the app calls `createSignedUrl` server-side via the Supabase client, producing a URL that expires in 10 minutes and is never persisted to disk or local storage.
- **Row Level Security everywhere.** Every `select`/`insert`/`update`/`delete` policy on `entries` and `streak_freezes` checks `auth.uid() = user_id`. A user physically cannot query another user's rows, even with a forged client request.
- **Storage folder isolation.** Storage policies check that the first path segment of an object key equals the requesting user's UID, so even if someone guessed another user's file path, the policy blocks the read.
- **Client-side image compression** before upload also strips EXIF metadata (re-encoding via canvas drops the original EXIF block, including embedded GPS location if the photo had it).
- **No local persistence of decrypted images.** Offline-captured photos are queued as blobs in IndexedDB only until upload succeeds, then deleted from the queue.

---

## Project structure

```
src/
  components/      CameraCapture, ContactSheet, FocusHeatmap, LogEntryForm, DayDetail, StatsPanel
  hooks/           useAuth (Supabase auth context), useOfflineQueue (IndexedDB upload queue)
  lib/             supabaseClient, entries (data access + streak math), imageUtils (compression)
  pages/           AuthScreen, Dashboard
  styles/          tokens.css (design system: color, type, spacing variables)
supabase/
  schema.sql       full DB + storage + RLS setup, run once in SQL Editor
```

---

## Design notes

The visual language is a "darkroom logbook" rather than a typical SaaS dashboard: warm near-black ink background, a phosphor-amber accent (evoking a desk lamp), sage for positive/streak states, clay for missed days. Headers use Fraunces (a serif with real character) and body/UI text uses Inter; timestamps and stats use IBM Plex Mono to read like log entries. The signature element — the contact-sheet filmstrip — is a deliberate visual anchor that ties the "photograph" and "daily record" concepts together rather than defaulting to a generic colored-square heatmap.
