// Pings the Supabase database every few days so the free-tier project never pauses for inactivity.
// SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set at deploy time (the publishable key is the public browser key).
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // Visiting the worker URL runs the ping too (handy for a manual check).
  async fetch(_request, env) {
    const result = await ping(env);
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  },
};

async function ping(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ping`, {
    method: 'POST',
    // Publishable keys are not JWTs: send them only in the apikey header, never as Authorization: Bearer.
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: '{}',
  });
  const body = await res.text();
  console.log(`supabase ping: ${res.status} ${body}`);
  return { status: res.status, body };
}
