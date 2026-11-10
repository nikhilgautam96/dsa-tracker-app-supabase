import { useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Download, LogOut, Upload } from 'lucide-react';
import type { TrackerStore } from '../lib/trackerStore';
import { VersionSwitcher } from './VersionSwitcher';
import { ThemeToggle } from './ui/ThemeToggle';

export interface TopicStat {
  cat: string;
  total: number;
  solved: number;
}

const SYNC = {
  synced: { text: 'Synced', dot: 'bg-ok' },
  syncing: { text: 'Syncing…', dot: 'bg-fg-subtle animate-pulse' },
  offline: { text: 'Offline · saved on this device', dot: 'bg-warn' },
  error: { text: 'Sync error · retrying', dot: 'bg-danger' },
} as const;

interface SidebarProps {
  store: TrackerStore;
  session: Session;
  topics: TopicStat[];
  allCount: number;
  selected: Set<string>;
  onPickTopic: (cat: string | null, multi: boolean) => void;
  overall: { solved: number; total: number };
  onExport: () => void;
  onImportFile: (f: File) => void;
  onSignOut: () => void;
}

function Bar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`block h-1 overflow-hidden rounded-full bg-line-soft ${className}`}>
      <span className="block h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </span>
  );
}

export function Sidebar({ store, session, topics, allCount, selected, onPickTopic, overall, onExport, onImportFile, onSignOut }: SidebarProps) {
  const file = useRef<HTMLInputElement>(null);
  const sync = SYNC[store.syncState];
  const pending = store.pendingCount();
  const meta = session.user.user_metadata as { avatar_url?: string; full_name?: string; name?: string };
  const name = meta.full_name || meta.name || session.user.email || 'Account';

  return (
    <nav aria-label="Tracker" className="flex h-full flex-col bg-canvas">
      <div className="px-4 pt-5 pb-4">
        <p className="font-serif text-2xl leading-none">DSA Tracker</p>
        <div className="mt-4">
          <VersionSwitcher store={store} />
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="label-micro">Progress</span>
            <span className="font-mono text-meta">
              <span className="text-fg">{overall.solved}</span>
              <span className="text-fg-subtle"> / {overall.total}</span>
            </span>
          </div>
          <Bar value={overall.total ? overall.solved / overall.total : 0} className="mt-1.5 h-1.5" />
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <p className="label-micro px-2 pt-1 pb-2">Topics</p>
        <ul role="list" className="space-y-px">
          <li>
            <button
              type="button"
              aria-pressed={selected.size === 0}
              onClick={() => onPickTopic(null, false)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-meta ${selected.size === 0 ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-hover hover:text-fg'}`}
            >
              <span className="flex-1">All topics</span>
              <span className="font-mono text-micro">{allCount}</span>
            </button>
          </li>
          {topics.map((t) => {
            const on = selected.has(t.cat);
            return (
              <li key={t.cat}>
                <button
                  type="button"
                  aria-pressed={on}
                  title="Click to show only this topic · ⌘/Ctrl-click to add it"
                  onClick={(e) => onPickTopic(t.cat, e.metaKey || e.ctrlKey || e.shiftKey)}
                  className={`group w-full rounded-lg px-2 py-1.5 text-left ${on ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-hover hover:text-fg'} ${t.total === 0 ? 'opacity-50' : ''}`}
                >
                  <span className="flex items-center gap-2 text-meta">
                    <span className="min-w-0 flex-1 truncate">{t.cat}</span>
                    <span className="font-mono text-micro">
                      {t.solved}/{t.total}
                    </span>
                  </span>
                  <Bar value={t.total ? t.solved / t.total : 0} className="mt-1 opacity-80" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-1 border-t border-line-soft px-2 py-3">
        <p className="flex items-center gap-2 px-2 py-1 text-micro text-fg-muted" title={store.lastError || undefined} role="status">
          <span className={`size-2 rounded-full ${sync.dot}`} aria-hidden="true" />
          {sync.text}
          {pending > 0 && store.syncState !== 'synced' && <span className="font-mono">· {pending} pending</span>}
        </p>
        <ThemeToggle withLabel />
        <div className="grid grid-cols-2 gap-1">
          <button type="button" className="btn btn-ghost justify-start px-2 font-normal text-fg-muted" onClick={onExport} title="Download this version's progress as JSON">
            <Download className="size-4" aria-hidden="true" /> Export
          </button>
          <button type="button" className="btn btn-ghost justify-start px-2 font-normal text-fg-muted" onClick={() => file.current?.click()} title="Import progress from a JSON file">
            <Upload className="size-4" aria-hidden="true" /> Import
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          {meta.avatar_url ? (
            <img src={meta.avatar_url} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-surface font-mono text-micro">{name.slice(0, 1).toUpperCase()}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta">{name}</span>
            {name !== session.user.email && <span className="block truncate text-micro text-fg-subtle">{session.user.email}</span>}
          </span>
          <button type="button" className="btn btn-ghost size-8 px-0" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
