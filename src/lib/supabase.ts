import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
/** Supabase publishable key (sb_publishable_…): public by design; data access is enforced by row-level security. */
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when the Supabase env vars are present (see .env.example). */
export const isConfigured = Boolean(url && publishableKey && !url.includes('YOUR-PROJECT-REF') && publishableKey.startsWith('sb_publishable_'));

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null;
