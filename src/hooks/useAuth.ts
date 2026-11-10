import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Access = 'unknown' | 'allowed' | 'denied';

const ALLOWED_CACHE = 'dsa-tracker:allowed';

/** Error from the OAuth redirect (e.g. cancelled consent, provider disabled), read once from the URL. */
function readRedirectError(): string {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  const err = params.get('error_description') || params.get('error');
  if (!err) return '';
  window.history.replaceState(null, '', window.location.pathname);
  if (/access_denied|cancel/i.test(err)) return 'Google sign-in was cancelled.';
  if (/provider is not enabled|Unsupported provider/i.test(err)) return 'Google sign-in isn’t enabled for this tracker yet.';
  return err.replace(/\+/g, ' ');
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState(readRedirectError);
  // access answer, tagged with the user it belongs to (a user switch reads as 'unknown' without resetting state)
  const [checked, setChecked] = useState<{ uid: string; access: Access } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Allowlist check; if Supabase is unreachable, use the last known answer so the app still works offline.
  const uid = session?.user.id;
  useEffect(() => {
    if (!supabase || !uid) return;
    let cancelled = false;
    supabase.rpc('am_i_allowed').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        const cached = localStorage.getItem(`${ALLOWED_CACHE}:${uid}`);
        setChecked({ uid, access: cached === 'false' ? 'denied' : 'allowed' });
        return;
      }
      localStorage.setItem(`${ALLOWED_CACHE}:${uid}`, String(Boolean(data)));
      setChecked({ uid, access: data ? 'allowed' : 'denied' });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const access: Access = uid && checked?.uid === uid ? checked.access : 'unknown';

  const signInWithGoogle = async (selectAccount = false) => {
    if (!supabase) return;
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: selectAccount ? { prompt: 'select_account' } : undefined,
      },
    });
    if (error) setAuthError(/not enabled|Unsupported provider/i.test(error.message) ? 'Google sign-in isn’t enabled for this tracker yet.' : error.message);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  /** Sign out, then reopen Google's account chooser. */
  const switchAccount = async () => {
    await signOut();
    await signInWithGoogle(true);
  };

  return { session, loading, access, authError, signInWithGoogle, signOut, switchAccount };
}
