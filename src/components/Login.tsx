import { useState, type FormEvent } from 'react';
import { googleEnabled, supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const redirectTo = window.location.origin + window.location.pathname;

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setState('error');
      setMessage(error.message);
    } else {
      setState('sent');
    }
  };

  const google = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) {
      setState('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="center">
      <div className="card">
        <h1>DSA Master Tracker</h1>
        <p className="muted">Invite-only. Sign in with the email you were invited with.</p>
        {state === 'sent' ? (
          <p className="ok-text">
            Check <b>{email}</b> for a sign-in link. You can close this tab; the link opens the tracker.
          </p>
        ) : (
          <form onSubmit={sendLink} className="stack">
            <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <button className="primary" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {googleEnabled && (
              <button type="button" onClick={google}>
                Continue with Google
              </button>
            )}
            {state === 'error' && <p className="err-text">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export function NotInvited({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="center">
      <div className="card">
        <h1>Not invited yet</h1>
        <p className="muted">
          <b>{email}</b> isn't on this tracker's allowlist. Ask the owner to add it, then reload.
        </p>
        <button onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

export function NotConfigured() {
  return (
    <div className="center">
      <div className="card">
        <h1>Supabase isn't configured</h1>
        <p className="muted">
          Copy <code>.env.example</code> to <code>.env</code>, fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart{' '}
          <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
