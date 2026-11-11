# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.1.0] - 2026-11-11

### Added

- Company filter, a separate pill group in the filter bar and the mobile sheet, with live counts. The first company is EPAM, with 57 questions: the 44 DSA questions from its prep guide (plus Fruit Into Baskets as a free alternative to Premium #340) and 12 Java 8 Streams questions.
- 26 new problems: 14 DSA problems from the EPAM list that weren't in the tracker yet, and the 12 Streams questions under a new "Java 8 Streams" topic.
- Streams answers page at `/epam/java8-streams.html`, which the Streams rows link to. It covers the approach, Java 8 code, verified output and interview notes for each question.
- Company badge on problem rows. The note "EPAM guide: P1 #2 …" shows where each question sits in the guide, and search matches company names.
- Company lists live in `data-pipeline/companies.py`. Add a company there and re-run `export.py`.

## [2.0.0] - 2026-11-11

### Added

- Google sign-in, replacing the email magic link. The invite list still applies, and the "Not invited" screen offers "Use a different Google account".
- Versions: up to 5 separate tracking rounds per user, each starting from zero, with create, rename, switch and delete. Existing progress moved into "Version 1".
- A solution link is required to mark a problem solved. It is enforced in the UI, the offline queue and the database. Problems solved earlier are kept with an "add link" badge, and a "Missing link" filter lists them.
- The owner import pre-fills 62 LeetCode submission links found in Notion.
- Revisit flag per problem and version, with a Revisit filter.
- Per-problem notes, shared across versions and autosaved.
- Detail panel with the solution, revisit, notes, sources, difficulty source and Pepcoding videos.
- Light/dark theme toggle (light by default, no flash on load).

### Changed

- Redesign: sidebar with versions and per-topic progress, a compact sticky filter bar (Source/Platform dropdowns, status, difficulty, flags, removable chips) and calmer rows.
- Mobile: the sidebar becomes a drawer, filters open in a bottom sheet, and rows become compact cards.
- Visual style matches the portfolio: Dove Grey & Pearl Silver tokens, deep-rose/lavender accent, IBM Plex Sans/Mono and Newsreader. Difficulty colours meet WCAG AA in both themes.
- Styling moved to Tailwind CSS v4.
- Database: migrations now live in `supabase/migrations/` (001 init, 002 v2, 003 upsert fix).

### Fixed

- CI reads the Supabase settings from either repository variables or secrets, and fails early on `main` if they are missing.
- The keep-alive worker deploys with its own config. Before, running Wrangler from its folder redeployed the site instead.
- Anonymous users can no longer call the allowlist helper functions.

## [1.0.0] - 2026-11-11

### Added

- Invite-only DSA tracker: 655 problems from Blind 75, Grind 75, Grind 169, LeetCode Design, ROADMAP.md and Pepcoding Level 3 (all 274 videos).
- Pill filters for topic, source, platform, status and difficulty, with live counts; search; collapsible topic sections with progress bars.
- Difficulty for every problem: native LeetCode/Codeforces/CodeChef/Kattis levels, levels borrowed from an equivalent LeetCode problem, AtCoder Problems estimates or Pepcoding labels, and marked estimates — each with a "referenced from" note.
- Supabase email magic-link sign-in (Google optional) limited to an `allowed_emails` allowlist.
- Per-user progress in Supabase with row-level security; rows for the same problem share one checkbox.
- Local-first sync: ticks are cached on the device, queued while offline or during outages, and synced automatically.
- Import/Export of progress as JSON (accepts exports from the old single-file tracker).
- Keep-alive Cloudflare Worker that pings the database every 3 days so the free project doesn't pause.
- GitHub Actions: checks on every push and pull request; deploy to Cloudflare on `main`.
