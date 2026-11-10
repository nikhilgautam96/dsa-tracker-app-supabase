# DSA Master Tracker

Invite-only tracker for 655 DSA problems (Blind 75, Grind 75/169, LeetCode Design, ROADMAP.md, Pepcoding Level 3).

- **Live:** https://dsa-tracker.nikhilgautam.workers.dev
- **Repo:** github.com/nikhilgautam96/dsa-tracker-app-supabase
- **UI:** React 19 + Vite SPA, Tailwind CSS v4 with the portfolio's design tokens (IBM Plex Sans/Mono, Newsreader),
  light/dark theme. Sidebar + list layout; drawer and filter sheet on mobile. The problem list is a static file
  (`public/problems.json`).
- **Auth:** Google sign-in via Supabase, limited to emails in `allowed_emails`.
- **Data (Supabase Postgres, row-level security on every table):**
  - **Versions:** up to 5 separate tracking rounds per user, each starting from zero.
  - **Progress per version:** solved + **required solution link**, revisit flag, solved date.
  - **Notes per problem:** shared across versions.
- **Offline:** every change is cached on the device and queued; it syncs automatically when Supabase is reachable.
- **Keep-alive:** a Cloudflare Worker pings the database every 3 days so the free project doesn't pause.
- **Hosting:** Cloudflare Workers static assets, deployed by GitHub Actions on `main`.

## Rules the database enforces

These are checked in Postgres, not only in the UI, so a hand-crafted request can't bypass them:

- A problem can only be marked solved with an `https://` solution link (≤ 500 chars). Problems solved before
  links were required are kept as solved with `needs_link` ("add link" in the app); clients can't set that flag.
- At most 5 versions per user; the last version can't be deleted (`delete_version()`).
- Every row belongs to its owner (`user_id = auth.uid()`) and only allowlisted emails can read or write.

## One-time setup

1. **Supabase project:** create a free project at supabase.com. Pick the region closest to your users.
2. **Env:** `cp .env.example .env`, then fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   from *Project Settings → API Keys*. Use the **publishable** key (`sb_publishable_…`). Never put the secret key
   `sb_secret_…` in this project: it bypasses row-level security.
3. **Database:** in *SQL Editor → New query*, run each file in `supabase/migrations/` **in order**
   (`001_init.sql`, `002_v2.sql`, `003_needs_link_upsert.sql`). Then allow yourself:
   ```sql
   insert into public.allowed_emails (email, note) values ('you@gmail.com', 'owner');
   ```
4. **Google sign-in:** follow the guide below.
5. **Auth URLs:** under *Authentication → URL Configuration*:
   - **Site URL:** `https://dsa-tracker.nikhilgautam.workers.dev`. Supabase's default is `http://localhost:3000`, and
     any redirect not on the list below falls back to it, so change it.
   - **Redirect URLs:** `https://dsa-tracker.nikhilgautam.workers.dev/**` and `http://localhost:5173/**`. Keep the `/**`
     wildcard: without it the app's return address (with a trailing slash) doesn't match and you land on the Site URL.

### Google sign-in (dashboard steps)

1. **Google Cloud project:** go to https://console.cloud.google.com, create a project (e.g. `dsa-tracker`) and select it.
2. **Google Auth Platform (OAuth consent screen):** *APIs & Services → OAuth consent screen* (or *Google Auth Platform*).
   - App name `DSA Tracker`, your support email, **Audience: External**, developer contact email. Save.
   - While the app is in **Testing**, only Google accounts listed under *Audience → Test users* can sign in (up to 100).
     Add yourself and anyone you invite. Alternatively click **Publish app**. The basic `email`/`profile` scopes
     need no verification. The tracker's own allowlist still decides who gets in.
3. **OAuth client:** *Credentials → Create credentials → OAuth client ID*.
   - **Application type:** Web application.
   - **Authorized JavaScript origins:** `https://dsa-tracker.nikhilgautam.workers.dev` and `http://localhost:5173`.
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`. The exact value is shown
     in Supabase under *Authentication → Sign In / Providers → Google*.
   - Create, then copy the **Client ID** and **Client secret**.
4. **Supabase:** *Authentication → Sign In / Providers → Google*: enable it, paste the Client ID and Client secret, save.
5. **Turn off email sign-in:** *Authentication → Sign In / Providers → Email*: disable it, so Google is the only way in.
   Optionally also turn off "Allow new users to sign up" and invite people from *Authentication → Users*.
6. Open the site, click **Continue with Google**. A Google account that isn't in `allowed_emails` sees "Not invited yet".

## Using it

- **Mark solved:** tick the box, paste your solution link (LeetCode submission, GitHub file, gist, Codeforces
  submission, …) and press **Mark solved**. LeetCode problems pre-fill `…/problems/<slug>/submissions/`, so you
  only add the submission id. Unticking asks for confirmation and keeps the link for next time.
- **Missing link:** filter for problems solved before links were required, then add their links over time.
- **Revisit ★:** flag problems to come back to in the current version, then use the Revisit filter.
- **Notes:** click a row to open the detail panel. Notes autosave and are shared across versions.
- **Versions:** use the switcher at the top of the sidebar, then **Manage versions…** to create, rename or delete.
- **Import/Export:** applies to the active version. Export includes solution links, revisit flags and notes.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Workflow & deploy

Same flow as the portfolio: `main` is production, `dev` is integration, and changes go on `feat/…` / `bug/…` branches.
Commits follow Conventional Commits. Releases are recorded in `CHANGELOG.md` and tagged `vX.Y.Z`.

```bash
git switch dev && git switch -c feat/my-change
# …edit, commit…
git push -u origin feat/my-change      # open a PR into dev  → CI checks + build
# merge dev → main                     → CI checks, then deploys to Cloudflare
git tag v1.1.0 && git push --tags      # after updating CHANGELOG.md
```

GitHub Actions (`.github/workflows/deploy.yml`) needs these under *Settings → Secrets and variables → Actions*.
The two `VITE_` values can be added as either variables or secrets; the workflow reads both.

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare API token from the "Edit Cloudflare Workers" template |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Variable or secret | `VITE_SUPABASE_URL` | Supabase project URL |
| Variable or secret | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) |

Manual deploy from your machine (needs `npx wrangler login` once and a filled `.env`):

```bash
npm run deploy
```

## Adding users

```sql
insert into public.allowed_emails (email, note) values ('friend@gmail.com', 'friend');
-- remove: delete from public.allowed_emails where email = 'friend@gmail.com';
```

If the Google app is still in Testing mode, also add them as a test user in Google Cloud.

## Importing existing progress

Sign in, click **Import** in the sidebar, and choose a JSON file. The importer accepts:

- **This app's exports.**
- **The owner file** `data-pipeline/out/my-progress.json`: auto-detected solved problems (LeetCode + Notion) and the
  LeetCode submission links recorded in Notion.
- **Exports from the old single-file HTML tracker.**

Problems with a link are marked solved with it. Problems without one are kept as solved and flagged "add link".

## Updating the problem list

Raw inputs live in `data-pipeline/raw/`. That folder is git-ignored because it contains personal LeetCode data.
Edit `data-pipeline/build.py`, `pep_map.py` or `levels.py`, then:

```bash
npm run data         # regenerates public/problems.json and data-pipeline/out/my-progress.json
```

Then commit `public/problems.json` and merge to `main` to deploy. Problem keys are stable (`lc:<slug>` or the
problem URL), so existing progress survives list updates.

## Backups

Free Supabase projects have no automatic backups. Use **Export** in the app, or upgrade to Supabase Pro for daily backups.
