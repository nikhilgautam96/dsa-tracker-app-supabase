import type { ReactNode } from 'react';
import { ThemeToggle } from './ui/ThemeToggle';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <p className="label-micro mb-3">Invite-only</p>
        {children}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function Login({ error, onGoogle }: { error: string; onGoogle: () => void }) {
  return (
    <Frame>
      <h1 className="font-serif text-4xl leading-tight">DSA Master Tracker</h1>
      <p className="mt-3 text-fg-muted">
        655 problems across Blind 75, Grind, LeetCode Design, your roadmap and Pepcoding Level 3, with progress that follows you across devices.
      </p>
      <button type="button" className="btn mt-8 min-h-11 w-full text-[0.9375rem]" onClick={onGoogle}>
        <GoogleMark />
        Continue with Google
      </button>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-meta text-warn">
          {error}
        </p>
      )}
      <p className="mt-6 text-meta text-fg-subtle">Only invited Google accounts can open the tracker.</p>
    </Frame>
  );
}

export function NotInvited({ email, onSwitch, onSignOut }: { email: string; onSwitch: () => void; onSignOut: () => void }) {
  return (
    <Frame>
      <h1 className="font-serif text-3xl leading-tight">Not invited yet</h1>
      <p className="mt-3 text-fg-muted">
        You signed in as <span className="font-medium text-fg">{email || 'an unknown account'}</span>, which isn’t on this tracker’s invite list. Ask the owner to add
        it, or try another Google account.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <button type="button" className="btn btn-primary min-h-11" onClick={onSwitch}>
          Use a different Google account
        </button>
        <button type="button" className="btn btn-ghost min-h-11" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </Frame>
  );
}

export function NotConfigured() {
  return (
    <Frame>
      <h1 className="font-serif text-3xl leading-tight">Supabase isn’t configured</h1>
      <p className="mt-3 text-fg-muted">
        Copy <code className="font-mono text-meta">.env.example</code> to <code className="font-mono text-meta">.env</code>, fill in{' '}
        <code className="font-mono text-meta">VITE_SUPABASE_URL</code> and <code className="font-mono text-meta">VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart{' '}
        <code className="font-mono text-meta">npm run dev</code>.
      </p>
    </Frame>
  );
}

export function Splash({ text, error }: { text: string; error?: boolean }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        {!error && <span className="size-5 animate-spin rounded-full border-2 border-line border-t-fg-muted" aria-hidden="true" />}
        <p className={error ? 'max-w-sm text-fg' : 'text-fg-muted'} role={error ? 'alert' : 'status'}>
          {text}
        </p>
        {error && (
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        )}
      </div>
    </div>
  );
}
