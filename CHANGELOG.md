# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
