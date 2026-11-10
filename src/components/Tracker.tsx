import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Filters, Level, ProblemData, Status } from '../lib/types';
import { LEVELS, SOURCE_GROUPS, STATUSES, emptyFilters, matches, platformOrder, srcGroup, type FacetSkip } from '../lib/filters';
import { useProgress } from '../hooks/useProgress';
import { PillGroup } from './PillGroup';
import { ProblemRow } from './ProblemRow';

const COLLAPSED_KEY = 'dsa-tracker:collapsed';

const SYNC_LABEL = {
  synced: { text: 'Synced', cls: 'ok' },
  syncing: { text: 'Syncing…', cls: '' },
  offline: { text: 'Offline – changes saved locally, will sync', cls: 'warn' },
  error: { text: 'Sync error – retrying', cls: 'err' },
} as const;

interface TrackerProps {
  data: ProblemData;
  session: Session;
  onSignOut: () => void;
}

export function Tracker({ data, session, onSignOut }: TrackerProps) {
  const store = useProgress(session.user.id);
  const isSolved = useCallback((pk: string) => store.isSolved(pk), [store]);
  const [f, setF] = useState<Filters>(emptyFilters);
  const [qInput, setQInput] = useState('');
  const q = useDeferredValue(qInput.trim().toLowerCase());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}'));
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filters = useMemo(() => ({ ...f, q }), [f, q]);
  const platforms = useMemo(() => platformOrder(data.items), [data.items]);

  useEffect(() => localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)), [collapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ---- facet counts (each facet counted with the other filters applied) ----
  const counts = useMemo(() => {
    const count = (skip: FacetSkip, keyOf: (p: (typeof data.items)[number]) => string[]) => {
      const c: Record<string, number> = {};
      let all = 0;
      for (const p of data.items) {
        if (!matches(p, filters, isSolved, skip)) continue;
        all++;
        for (const k of new Set(keyOf(p))) c[k] = (c[k] ?? 0) + 1;
      }
      c.All = all;
      return c;
    };
    return {
      cat: count('cat', (p) => [p.cat]),
      src: count('src', (p) => p.sources.map(srcGroup)),
      plat: count('plat', (p) => [p.platform]),
    };
    // store version changes re-run this through isSolved results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.items, filters, isSolved, store.getVersion()]);

  const visible = useMemo(
    () => data.items.filter((p) => matches(p, filters, isSolved)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.items, filters, isSolved, store.getVersion()],
  );
  const solvedVisible = visible.filter((p) => isSolved(p.pk)).length;

  // ---- filter updates ----
  const toggleIn = (key: 'cat' | 'src' | 'plat') => (v: string) =>
    setF((prev) => {
      const next = new Set(prev[key]);
      if (v === 'All') next.clear();
      else if (next.has(v)) next.delete(v);
      else next.add(v);
      return { ...prev, [key]: next };
    });

  const onToggle = useCallback((pk: string, value: boolean) => store.setSolved(pk, value), [store]);

  // ---- import / export ----
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), solved: store.solvedKeys() }, null, 1)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dsa-tracker-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const j = JSON.parse(await file.text()) as { solved?: unknown; overrides?: Record<string, boolean> };
      const keys = new Set<string>();
      if (Array.isArray(j.solved)) j.solved.forEach((k) => typeof k === 'string' && keys.add(k));
      if (j.overrides) Object.entries(j.overrides).forEach(([k, v]) => v === true && keys.add(k));
      const known = new Set(data.items.map((p) => p.pk));
      const valid = [...keys].filter((k) => known.has(k));
      const added = store.importSolved(valid);
      setNotice(`Imported ${valid.length} solved problems (${added} new${keys.size > valid.length ? `, ${keys.size - valid.length} unknown keys skipped` : ''}).`);
    } catch (e) {
      setNotice(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const allCollapsed = data.cats.every((c) => collapsed[c]);
  const sync = SYNC_LABEL[store.syncState];
  const pending = store.pendingCount();

  return (
    <>
      <header>
        <div className="top">
          <h1>DSA Master Tracker</h1>
          <div className="progress">
            <span>
              {solvedVisible} / {visible.length} solved
              {visible.length !== data.items.length && ` (filtered from ${data.items.length})`}
            </span>
            <div className="bar">
              <i style={{ width: `${visible.length ? (solvedVisible / visible.length) * 100 : 0}%` }} />
            </div>
          </div>
          <span className={`sync ${sync.cls}`} title={store.lastError || undefined}>
            ● {sync.text}
            {pending > 0 && store.syncState !== 'synced' ? ` (${pending} pending)` : ''}
          </span>
          <div className="tools">
            <button onClick={() => setCollapsed(Object.fromEntries(data.cats.map((c) => [c, !allCollapsed])))}>
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
            <button onClick={exportJson} title="Download your solved list as JSON">
              Export
            </button>
            <button onClick={() => fileRef.current?.click()} title="Mark problems solved from an exported JSON">
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importJson(file);
                e.target.value = '';
              }}
            />
            <button onClick={onSignOut} title={session.user.email ?? ''}>
              Sign out
            </button>
          </div>
        </div>

        <div className="row">
          <span className="lbl">Topic</span>
          <PillGroup
            options={['All', ...data.cats.filter((c) => counts.cat[c] || f.cat.has(c))]}
            counts={counts.cat}
            isOn={(v) => (v === 'All' ? !f.cat.size : f.cat.has(v))}
            onPick={toggleIn('cat')}
          />
        </div>
        <div className="row">
          <span className="lbl">Source</span>
          <PillGroup
            options={['All', ...SOURCE_GROUPS]}
            counts={counts.src}
            isOn={(v) => (v === 'All' ? !f.src.size : f.src.has(v))}
            onPick={toggleIn('src')}
          />
        </div>
        <div className="row">
          <span className="lbl">Platform</span>
          <PillGroup
            options={['All', ...platforms.filter((p) => counts.plat[p] || f.plat.has(p))]}
            counts={counts.plat}
            isOn={(v) => (v === 'All' ? !f.plat.size : f.plat.has(v))}
            onPick={toggleIn('plat')}
          />
        </div>
        <div className="row">
          <span className="lbl">Filter</span>
          <PillGroup options={STATUSES} isOn={(v) => f.status === v} onPick={(v) => setF((p) => ({ ...p, status: v as Status }))} />
          <span className="gap" />
          <PillGroup options={LEVELS} isOn={(v) => f.level === v} onPick={(v) => setF((p) => ({ ...p, level: v as Level }))} />
          <input ref={searchRef} type="search" placeholder="Search title, number, tag…  ( / )" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        {notice && (
          <div className="notice" onClick={() => setNotice('')}>
            {notice} <small>(click to dismiss)</small>
          </div>
        )}
      </header>

      <main>
        {!visible.length && <div className="empty">No problems match these filters.</div>}
        {data.cats.map((c) => {
          const list = visible.filter((p) => p.cat === c);
          if (!list.length) return null;
          const s = list.filter((p) => isSolved(p.pk)).length;
          const isCollapsed = !!collapsed[c];
          return (
            <section key={c} className={isCollapsed ? 'collapsed' : ''}>
              <h2 onClick={() => setCollapsed((prev) => ({ ...prev, [c]: !prev[c] }))}>
                {c} <span className="cnt">{s}/{list.length}</span>
                <span className="mini">
                  <i style={{ width: `${(s / list.length) * 100}%` }} />
                </span>
              </h2>
              {!isCollapsed && (
                <div className="list">
                  {list.map((p) => (
                    <ProblemRow key={p.key} p={p} solved={isSolved(p.pk)} onToggle={onToggle} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <p className="legend">
          Your ticks are saved to your account and cached on this device, so they work offline and sync when you're back. <b>≈ closest match</b> = Pepcoding's own judge is
          offline, so this links the most plausible original or an equivalent problem. <b>practice</b> = concept video, linked to a canonical problem for that concept.{' '}
          <b>concept</b> = theory lesson with no judge problem. Levels for non-LeetCode problems come from an equivalent LeetCode problem, the Codeforces/CodeChef rating
          (≤1200 Easy, ≤1800 Medium, above that Hard), AtCoder Problems, Kattis or Pepcoding; <i>est.</i> marks an estimate. ▶ opens the Pepcoding video.
        </p>
      </main>
    </>
  );
}
