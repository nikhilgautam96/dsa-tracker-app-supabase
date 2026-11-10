import { useEffect, useState } from 'react';
import type { ProblemData } from './lib/types';
import { isConfigured } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { Login, NotConfigured, NotInvited, Splash } from './components/AuthScreens';
import { Tracker } from './components/Tracker';

function useProblems() {
  const [data, setData] = useState<ProblemData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}problems.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ProblemData>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  return { data, error };
}

export default function App() {
  const { session, loading, access, authError, signInWithGoogle, signOut, switchAccount } = useAuth();
  const { data, error } = useProblems();

  if (!isConfigured) return <NotConfigured />;
  if (loading) return <Splash text="Loading…" />;
  if (!session) return <Login error={authError} onGoogle={() => void signInWithGoogle()} />;
  if (access === 'unknown') return <Splash text="Checking access…" />;
  if (access === 'denied') return <NotInvited email={session.user.email ?? ''} onSwitch={() => void switchAccount()} onSignOut={() => void signOut()} />;
  if (error) return <Splash error text={`Couldn’t load the problem list (${error}).`} />;
  if (!data) return <Splash text="Loading problems…" />;
  return <Tracker data={data} session={session} onSignOut={() => void signOut()} />;
}
