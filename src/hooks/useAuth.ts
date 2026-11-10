import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Access = 'unknown' | 'allowed' | 'denied';

const ALLOWED_CACHE = 'dsa-tracker:allowed';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  // access answer, tagged with the user it belongs to (so a user switch reads as 'unknown' without resetting state)
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

  // Allowlist check. If Supabase is unreachable, fall back to the last known answer so the app works offline.
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

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return { session, loading, access, signOut };
}
