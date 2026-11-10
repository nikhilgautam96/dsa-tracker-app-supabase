#!/usr/bin/env bash
# Builds and deploys the site (Cloudflare Workers static assets) and the keep-alive worker.
# Requires: `npx wrangler login` once, and a filled .env
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a
: "${VITE_SUPABASE_URL:?missing in .env}"; : "${VITE_SUPABASE_PUBLISHABLE_KEY:?missing in .env}"

npm run build
npx wrangler deploy                      # site: uses ./wrangler.jsonc, uploads ./dist

# --config is required: run from a subfolder, wrangler picks up the root wrangler.jsonc and redeploys the site instead
npx wrangler deploy --config workers/keepalive/wrangler.toml \
  --var "SUPABASE_URL:${VITE_SUPABASE_URL}" --var "SUPABASE_PUBLISHABLE_KEY:${VITE_SUPABASE_PUBLISHABLE_KEY}"
