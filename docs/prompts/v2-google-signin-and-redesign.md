# Prompt — DSA Tracker v2: Google sign-in, redesign, notes/revisit, versions

> Paste everything below the line into a new session opened in `tracker-app/`.
> Decisions marked **(default)** are my assumptions — change them before running if you disagree.

---

You are working on **DSA Master Tracker** in this repo (React 19 + Vite + TypeScript SPA, Supabase auth + Postgres with RLS,
deployed to Cloudflare Workers static assets by GitHub Actions on `main`). Read `README.md`, `supabase/schema.sql`,
`src/` and `.github/workflows/deploy.yml` first. Live: https://dsa-tracker.nikhilgautam.workers.dev

Deliver five things: **(1) Google-only sign-in, (2) a full UI redesign, (3) per-problem notes and a revisit flag,
(4) tracker versions, (5) a required solution link when marking a problem solved.** Keep everything that works today: 655 problems from `public/problems.json`, the allowlist,
per-user RLS, local-first sync with the offline queue, JSON import/export, the keep-alive worker and CI.

## Ground rules

- Branch `feat/v2-redesign` off `dev`. Conventional Commits, small logical commits. Update `CHANGELOG.md` under
  `[Unreleased]`. Open the work for review on `dev`; **do not merge to `main`** (that deploys) until I approve.
- No new paid services. No secrets in the repo or in chat. Never use the Supabase secret key.
- Problem keys (`pk`) must stay stable — existing progress must survive.
- Database changes go in a new idempotent migration file `supabase/migrations/002_v2.sql` (keep `schema.sql` as the
  full current schema too). It must migrate existing data without loss. I run SQL myself in the Supabase SQL editor,
  so give me the file and the exact steps.
- Accessibility: keyboard reachable, visible focus, `aria-pressed` on toggles, labelled controls, WCAG AA contrast in
  both themes (state ratios in a comment next to the colour tokens, like the portfolio does).
- `npm run lint` and `npm run build` must pass. Test in the browser at desktop and mobile widths, both themes.

## 1. Sign-in: Google only

- Replace the email magic-link form with a single **"Continue with Google"** button
  (`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`). Remove the magic-link code and
  the `VITE_ENABLE_GOOGLE` flag (from code, `.env.example`, workflow and README).
- Keep the allowlist (`allowed_emails`, matched on the Google account email, lower-cased) and the "Not invited" screen,
  now also showing which Google account was used, with "Use a different account" (sign out, then sign in again with
  `queryParams: { prompt: 'select_account' }`).
- Write a short **setup guide** in the README for me to follow (I'll do the dashboard steps myself):
  1. Google Cloud Console → new project → OAuth consent screen (External, app name, support email; testing mode is fine
     for a small invite-only group — note the 100 test-user limit and how to add test users, or publish it).
  2. Credentials → OAuth client ID → Web application. Authorized JavaScript origins:
     `https://dsa-tracker.nikhilgautam.workers.dev`, `http://localhost:5173`. Authorized redirect URI:
     `https://<project-ref>.supabase.co/auth/v1/callback`.
  3. Supabase → Authentication → Sign In / Providers → Google: paste client ID + secret, enable.
  4. Supabase → Authentication: disable email sign-ups / the email provider so only Google works; keep Site URL and
     Redirect URLs for the live site and localhost.
- Handle errors visibly (popup blocked, provider disabled, cancelled consent).

## 2. Redesign

### Layout — "Sidebar + list"

```
┌────────────┬──────────────────────────────────────────┐
│ DSA Tracker│ 🔍 Search…        [Source ▾][Platform ▾] │
│ v: Round 1▾│ [All|Unsolved|Solved] [Easy][Med][Hard]  │
│ 149/655 ▓▓░│ [Revisit ★]                              │
├────────────┼──────────────────────────────────────────┤
│ All     655│ Arrays & Hashing                 13/13 ✓ │
│ Arrays   13│  ☑ Two Sum             ● Easy  B75 G75 ★ │
│ Two Ptrs 10│  ☐ Product Except Self ● Med   B75 +1  ✎ │
│ …          │ Two Pointers                      7/10   │
│ ☾ theme    │  ☐ 3Sum                ● Med   B75 G75   │
│ ⎋ account  │                                          │
└────────────┴──────────────────────────────────────────┘
```

- **Sidebar** (fixed, scrolls on its own): app name, **version switcher**, overall progress bar, then the topic list
  (name, solved/total, thin progress bar; the active topic uses the accent). Multi-select topics with ⌘/Ctrl-click,
  single-select on plain click; "All" clears. Bottom: theme toggle, sync status (dot + label, details on hover),
  import/export, account menu (Google avatar/email, sign out).
- **Top bar** (sticky): search (`/` focuses it); **Source** and **Platform** as compact dropdown multi-selects with
  counts (replacing the long pill rows); **Status** as a segmented control; **Difficulty** as three small pills;
  a **Revisit ★** toggle; a "Clear filters" link when anything is active. Show active filters as removable chips
  when the dropdowns are closed.
- **List**: grouped by topic with sticky group headers (name, solved/total). Rows are calmer than today:
  checkbox · title (+ number in mono, muted) · difficulty (coloured dot + label) · up to 2 source tags then "+n" ·
  revisit star · note indicator. Move everything else out of the row.
- **Row detail**: clicking a row (not the title link or checkbox) opens a **right-side detail panel** (desktop) /
  full-height sheet (mobile) with: title link, platform/number, difficulty + the "referenced from" line, match badge
  (≈ / practice / concept) explained in words, all sources, topic tags, Pepcoding video links, the notes editor and the
  revisit toggle. Esc / close button returns focus to the row.
- Empty, loading and error states designed (not plain text). Respect `prefers-reduced-motion`.

### Visual style — match the portfolio, with a little more colour

Reuse the portfolio's design system (`/Users/nikhil_gautam/Desktop/CV/Developer/nikhil-portfolio/styles/globals.css`,
`lib/theme.ts`, `components/layout/ThemeToggle.tsx`, `components/content/CategoryFilter.tsx`) — read them:

- Tokens: `--canvas #f7f6f4 / #1f1e1d`, `--surface #e0ddda / #292827`, `--fg #373635 / #d2cfcb`,
  `--fg-muted #595858 / #aaa6a1`, `--fg-subtle`, `--line #c8c4c0 / #464442`, accent `#a13d4b` (light) / `#b49ae8`
  (dark) with `--accent-soft #f2e5e7 / #342d3e`. Accent only for selected states, the active topic, small labels and
  link underlines.
- Fonts: **IBM Plex Sans** (UI), **IBM Plex Mono** (numbers, counts, ratings), **Newsreader** (app title, section
  headings). Self-host via `@fontsource` packages (no runtime Google Fonts request).
- Pills/selected states exactly like the portfolio's `CategoryFilter` (accent border + accent text on accent-soft).
- **"Aesthetic, a few more colours, still clean":** add exactly one small semantic palette on top of the monochrome
  base — difficulty (Easy green, Medium amber, Hard rose) as muted, theme-tuned tones used only for the dot/label,
  plus the solved state. No per-topic rainbow. Every colour checked for AA contrast in both themes.
- **Light/dark toggle** like the portfolio: light by default on first visit, choice stored in `localStorage`, applied
  by a tiny inline script in `index.html` before first paint (no flash), `data-theme="dark"` on `<html>`,
  `meta[name=theme-color]` updated.
- Styling approach: Tailwind CSS v4 with the same `@theme inline` token mapping as the portfolio **(default)**, or
  keep plain CSS with the same variables — pick one and be consistent.

### Mobile

- Under ~768px: the sidebar becomes a slide-in drawer (hamburger in the top bar); filters open in a **bottom sheet**
  (topics, source, platform, status, difficulty, revisit) with "Apply"/"Clear"; rows become compact cards
  (title on one line, meta on the next); the detail panel becomes a full-height sheet. Tap targets ≥ 44px.

## 3. Notes and revisit

- Per problem: a **note** (plain text/markdown, autosaved with debounce, max ~10k chars) and a **revisit ★** flag.
- **(default)** Notes are **shared across versions** (they're your learning, not a round's progress); the revisit flag
  is **per version** (what to revisit in this round). Change this if you prefer otherwise.
- New "Revisit" filter. Note indicator on rows; full editor in the detail panel.
- Same local-first behaviour as progress: cached, queued offline, synced, included in Export/Import.

## 4. Versions (separate tracking rounds)

- Each user can have **up to 5 versions** (e.g. "Round 1", "Revision Jan"). Each version has its **own solved state,
  solution links and revisit flags, starting from zero**. Notes are shared (see above).
- **(default)** On migration, every existing user gets one version named **"Version 1"** holding all their current
  progress (my 149 solved).
- Version switcher in the sidebar: switch, create (name; starts empty), rename, delete (confirm dialog that states it
  permanently deletes that version's progress; cannot delete the last remaining version). Remember the active version
  per user (in the database, so it follows me across devices; cache locally).
- Enforce the 5-version limit **in the database** (trigger or check), not only in the UI; show a clear message at 5.
- Progress bar, counts and filters always reflect the active version. Export/Import work on the active version and
  say so; Export file includes the version name.

### Suggested schema (adapt as needed; RLS on everything, allowlist + `user_id = auth.uid()`)

- `tracker_versions (id uuid pk, user_id uuid → auth.users, name text 1–40 chars, created_at, unique(user_id, name))`
  + trigger limiting 5 per user.
- `progress` gains `version_id uuid → tracker_versions on delete cascade`; primary key becomes
  `(user_id, version_id, problem_key)`; backfill from a created "Version 1" per user.
- `revisit (user_id, version_id, problem_key, updated_at)` or a `revisit boolean` column on `progress` — choose and justify.
- `problem_notes (user_id, problem_key, note text, updated_at, pk(user_id, problem_key))`.
- `progress` gains `solution_url text` and `needs_link boolean default false`, with a check constraint
  `solved = false or solution_url is not null or needs_link = true` (see section 5).
- `user_settings (user_id pk, active_version_id)`.

## 5. Solution link required to mark solved

- A problem **cannot be marked solved without a solution link.** Ticking the checkbox (or pressing the tick shortcut)
  opens a small inline popover anchored to the row (bottom sheet on mobile) with a URL field, a "Paste" button, and
  **"Mark solved"**, which stays disabled until the URL is valid. Cancel / Esc leaves the problem unsolved.
- **Valid link (default):** an absolute `https://` URL, any domain (LeetCode submission, GitHub file/gist, CF
  submission, Notion page…), max ~500 chars. Show a friendly inline error otherwise. Prefill a sensible template when
  possible (e.g. `https://leetcode.com/problems/<slug>/submissions/`) so I only paste the submission id; never auto-accept
  a template unchanged.
- Enforced in **three places**: the UI, the local store (refuse to queue `solved = true` without a link), and the
  **database** (check constraint above; RLS policies unchanged otherwise), so a crafted request can't bypass it.
- Solution links are **per version** (each round has its own solutions).
- Display: solved rows show a small "solution ↗" link; the detail panel shows the full link with "Edit" (same
  validation) and the date it was marked solved.
- **Unticking (default):** asks for a quick confirm, sets `solved = false` but **keeps** the stored link, so re-ticking
  pre-fills it.
- **Existing solved without links (default: grandfather them):** my 149 migrated/imported solved stay solved but are
  flagged `needs_link = true`, shown with a subtle "add link" badge and a **"Missing solution link"** filter so I can
  backfill over time. Adding a link clears the flag. New ticks never use `needs_link`. Imports without links follow
  the same rule and the import summary says how many need links.
- Where a known submission link already exists (e.g. some Blind 75 rows in my Notion export contain
  `leetcode.com/problems/<slug>/submissions/<id>/` links — see `data-pipeline/raw/notion_blind75.tsv`), offer them as
  pre-filled links in the owner import (a separate `my-solution-links.json` generated by the data pipeline), still
  reviewable.
- Export/Import include `solution_url` and `needs_link`.

## Definition of done

- Google sign-in works locally and on a preview of the live site; non-allowlisted Google accounts see "Not invited".
- Redesign matches the layout and portfolio style in both themes, desktop and mobile; Lighthouse accessibility ≥ 95.
- Notes, revisit, versions work, sync across two browsers, and survive offline → online.
- Migration tested: my existing 149 solved appear under "Version 1" after running `002_v2.sql`, flagged as needing
  links, and the "Missing solution link" filter lists them.
- Marking solved without a valid link is impossible from the UI, the store and a direct API call (show me the
  rejected request).
- README updated (Google setup, versions, notes), CHANGELOG `[Unreleased]` filled, PR-ready branch on `dev`.
- Give me: a summary, the SQL steps to run, the Google/Supabase dashboard steps, and screenshots of light/dark
  desktop and mobile.
