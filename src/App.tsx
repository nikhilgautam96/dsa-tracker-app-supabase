import { useEffect, useState } from 'react';
import type { ProblemData } from './lib/types';
import { isConfigured } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { Login, NotConfigured, NotInvited } from './components/Login';
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

function Splash({ text }: { text: string }) {
  return (
    <div className="center">
      <p className="muted">{text}</p>
    </div>
  );
}

export default function App() {
  const { session, loading, access, signOut } = useAuth();
  const { data, error } = useProblems();

  if (!isConfigured) return <NotConfigured />;
  if (loading) return <Splash text="Loading…" />;
  if (!session) return <Login />;
  if (access === 'unknown') return <Splash text="Checking access…" />;
  if (access === 'denied') return <NotInvited email={session.user.email ?? ''} onSignOut={signOut} />;
  if (error) return <Splash text={`Couldn't load the problem list (${error}). Reload to retry.`} />;
  if (!data) return <Splash text="Loading problems…" />;
  return <Tracker data={data} session={session} onSignOut={signOut} />;
}
