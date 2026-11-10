# DSA Master Tracker

Invite-only tracker for 655 DSA problems (Blind 75, Grind 75/169, LeetCode Design, ROADMAP.md, Pepcoding Level 3),
with topic/source/platform/difficulty pill filters and per-user progress synced across devices.

- **UI:** React + Vite SPA. The problem list is a static file (`public/problems.json`).
- **Auth:** Supabase email magic link (Google optional). Access is limited to emails in `allowed_emails`.
- **Progress:** Supabase Postgres table `progress`, protected by row-level security (each user sees only their own rows).
- **Offline:** ticks are cached on the device and queued; they sync automatically when Supabase is reachable again.
- **Keep-alive:** a Cloudflare Worker pings the database every 3 days so the free project doesn't pause.
- **Live:** https://dsa-tracker.nikhilgautam.workers.dev
- **Repo:** github.com/nikhilgautam96/dsa-tracker-app-supabase
- **Hosting:** Cloudflare Workers static assets (Cloudflare's successor to Pages; global CDN, free unlimited static requests).

## One-time setup

1. **Supabase project** — create a free project at supabase.com (pick the region closest to your users, e.g. Mumbai).
2. **Env** — `cp .env.example .env`, then fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   from *Project Settings → API Keys* (the **publishable** key `sb_publishable_…`; never put the secret key
   `sb_secret_…` in this project — it bypasses row-level security).
3. **Database** — *SQL Editor → New query*, paste `supabase/schema.sql`, Run. Then allow yourself:
   ```sql
   insert into public.allowed_emails (email, note) values ('you@example.com', 'owner');
   ```
4. **Auth URLs** — *Authentication → URL Configuration*: set **Site URL** to your deployed URL
   (`https://dsa-tracker.nikhilgautam.workers.dev`) and add `http://localhost:5173` to **Redirect URLs** for local dev.
5. **Optional, recommended:** *Authentication → Sign In / Providers* → turn off "Allow new users to sign up" and invite
   people from *Authentication → Users → Invite*. The allowlist already blocks data access; this also stops strangers
   from creating empty accounts.
6. **Optional Google sign-in:** enable the Google provider in Supabase (needs a Google OAuth client), then set
   `VITE_ENABLE_GOOGLE=true`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Workflow & deploy

Same flow as the portfolio: `main` is production, `dev` is integration, changes go on `feat/…` / `bug/…` branches,
commits follow Conventional Commits, releases are recorded in `CHANGELOG.md` and tagged `vX.Y.Z`.

```bash
git switch dev && git switch -c feat/my-change
# …edit, commit…
git push -u origin feat/my-change      # open a PR into dev  → CI checks + build
# merge dev → main                     → CI checks, then deploys to Cloudflare
git tag v1.1.0 && git push --tags      # after updating CHANGELOG.md
```

GitHub Actions (`.github/workflows/deploy.yml`) needs, under *Settings → Secrets and variables → Actions*:
(the three `VITE_` values may be added as either variables or secrets; the workflow reads both)

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare API token from the "Edit Cloudflare Workers" template |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Variable | `VITE_SUPABASE_URL` | Supabase project URL |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) |
| Variable | `VITE_ENABLE_GOOGLE` | `false` (or `true` once Google sign-in is enabled) |

Manual deploy from your machine (needs `npx wrangler login` once and a filled `.env`):

```bash
npm run deploy
```

## Adding users

```sql
insert into public.allowed_emails (email, note) values ('friend@example.com', 'friend');
-- remove: delete from public.allowed_emails where email = 'friend@example.com';
```

## Importing existing progress

Sign in, click **Import**, and choose a JSON file containing `{"solved": ["<problem key>", ...]}`.
The owner's auto-detected solved list (LeetCode + Notion) is generated at `data-pipeline/out/my-progress.json`.
Exports from the old single-file HTML tracker are accepted too.

## Updating the problem list

Raw inputs live in `data-pipeline/raw/` (git-ignored: it contains personal LeetCode data).
Edit `data-pipeline/build.py`, `pep_map.py` or `levels.py`, then:

```bash
npm run data         # regenerates public/problems.json and data-pipeline/out/my-progress.json
npm run deploy
```

Problem keys are stable (`lc:<slug>` or the problem URL), so existing progress survives list updates.

## Backups

Free Supabase projects have no automatic backups. Use **Export** in the app, or upgrade to Supabase Pro for daily backups.
