import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Menu, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Filters, Problem, ProblemData } from '../lib/types';
import { activeFilterCount, companyOrder, emptyFilters, matches, platformOrder, srcGroup, type FacetSkip } from '../lib/filters';
import { UserFacingError } from '../lib/trackerStore';
import { useTracker } from '../hooks/useTracker';
import { Sidebar, type TopicStat } from './Sidebar';
import { ActiveChips, FilterBar, FilterSheetBody, type FacetCounts } from './Filters';
import { toggleSet } from '../lib/ui';
import { ProblemRow } from './ProblemRow';
import { DetailPanel } from './DetailPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { Sheet } from './ui/Sheet';

const MOBILE_QUERY = '(max-width: 767px)';
function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(MOBILE_QUERY);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
  );
}

interface TrackerProps {
  data: ProblemData;
  session: Session;
  onSignOut: () => void;
}

export function Tracker({ data, session, onSignOut }: TrackerProps) {
  const store = useTracker(session.user.id);
  const storeVersion = store.getVersion();
  const entry = useCallback((pk: string) => store.entry(pk), [store]);
  const mobile = useIsMobile();

  const [f, setF] = useState<Filters>(emptyFilters);
  const [qInput, setQInput] = useState('');
  const q = useDeferredValue(qInput.trim().toLowerCase());
  const [rowForm, setRowForm] = useState<{ key: string; mode: 'solve' | 'link' } | null>(null);
  const [unsolve, setUnsolve] = useState<Problem | null>(null);
  const [detail, setDetail] = useState<Problem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Sticky topic headings sit just below the sticky top bar, whose height changes with the filter chips.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filters = useMemo(() => ({ ...f, q }), [f, q]);
  const platforms = useMemo(() => platformOrder(data.items), [data.items]);
  const companies = useMemo(() => companyOrder(data.items), [data.items]);
  const knownKeys = useMemo(() => new Set(data.items.map((p) => p.pk)), [data.items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (store.rejection) setNotice({ text: store.rejection, tone: 'warn' });
  }, [store.rejection, storeVersion]);

  // ---- derived data (re-computed when filters or the store change) ----
  const { counts, topics, visible, overall, missingLinkCount, allTopicCount } = useMemo(() => {
    const facet = (skip: FacetSkip, keyOf: (p: Problem) => string[]) => {
      const c: Record<string, number> = {};
      for (const p of data.items) {
        if (!matches(p, filters, entry, skip)) continue;
        for (const k of new Set(keyOf(p))) c[k] = (c[k] ?? 0) + 1;
      }
      return c;
    };
    const counts: FacetCounts = {
      cat: facet('cat', (p) => [p.cat]),
      src: facet('src', (p) => p.sources.map(srcGroup)),
      plat: facet('plat', (p) => [p.platform]),
      company: facet('company', (p) => p.companies ?? []),
    };
    const byCat = new Map<string, TopicStat>(data.cats.map((c) => [c, { cat: c, total: 0, solved: 0 }]));
    let allTopicCount = 0;
    for (const p of data.items) {
      if (!matches(p, filters, entry, 'cat')) continue;
      const t = byCat.get(p.cat)!;
      t.total++;
      allTopicCount++;
      if (entry(p.pk).solved) t.solved++;
    }
    const visible = data.items.filter((p) => matches(p, filters, entry));
    let solved = 0;
    let missingLinkCount = 0;
    for (const p of data.items) {
      const e = entry(p.pk);
      if (e.solved) solved++;
      if (e.solved && e.needsLink) missingLinkCount++;
    }
    return {
      counts,
      topics: [...byCat.values()].filter((t) => t.total > 0 || f.cat.has(t.cat)),
      visible,
      overall: { solved, total: data.items.length },
      missingLinkCount,
      allTopicCount,
    };
    // storeVersion: re-derive when progress changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters, entry, storeVersion, f.cat]);

  const groups = useMemo(() => {
    const m = new Map<string, Problem[]>();
    for (const p of visible) {
      let list = m.get(p.cat);
      if (!list) m.set(p.cat, (list = []));
      list.push(p);
    }
    return data.cats.filter((c) => m.has(c)).map((c) => ({ cat: c, items: m.get(c)!, solved: m.get(c)!.filter((p) => entry(p.pk).solved).length }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, data.cats, entry, storeVersion]);

  // ---- actions ----
  const pickTopic = (cat: string | null, multi: boolean) => {
    setF((p) => ({ ...p, cat: cat === null ? new Set() : multi ? toggleSet(p.cat, cat) : p.cat.size === 1 && p.cat.has(cat) ? new Set() : new Set([cat]) }));
    setDrawer(false);
  };
  const clearAll = () => {
    setF(emptyFilters());
    setQInput('');
  };
  const onCheck = useCallback(
    (p: Problem) => {
      if (store.entry(p.pk).solved) setUnsolve(p);
      else setRowForm((cur) => (cur?.key === p.key && cur.mode === 'solve' ? null : { key: p.key, mode: 'solve' }));
    },
    [store],
  );
  const onFormSubmit = useCallback(
    (p: Problem, url: string) => {
      try {
        if (rowForm?.mode === 'link') store.setSolutionUrl(p.pk, url);
        else store.markSolved(p.pk, url);
        setRowForm(null);
      } catch (e) {
        setNotice({ text: e instanceof UserFacingError ? e.message : 'Could not save.', tone: 'warn' });
      }
    },
    [store, rowForm],
  );
  const onRevisit = useCallback((p: Problem) => store.toggleRevisit(p.pk), [store]);
  const onAddLink = useCallback((p: Problem) => setRowForm({ key: p.key, mode: 'link' }), []);
  const onFormCancel = useCallback(() => setRowForm(null), []);
  const onOpen = useCallback((p: Problem) => setDetail(p), []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store.exportData(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dsa-tracker-${(store.activeVersion?.name ?? 'progress').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (file: File) => {
    try {
      const s = await store.importData(JSON.parse(await file.text()), knownKeys);
      const parts = [
        s.linked && `${s.linked} marked solved with links`,
        s.legacy && `${s.legacy} solved without links (flagged “add link”)`,
        s.revisit && `${s.revisit} revisit flags`,
        s.notes && `${s.notes} notes`,
        s.skipped && `${s.skipped} unknown problems skipped`,
      ].filter(Boolean);
      setNotice({ text: `Imported into “${store.activeVersion?.name}”: ${parts.join(', ') || 'nothing new'}.`, tone: 'ok' });
    } catch (e) {
      setNotice({ text: e instanceof UserFacingError ? e.message : `Import failed: ${e instanceof Error ? e.message : String(e)}`, tone: 'warn' });
    }
  };

  const filterCount = activeFilterCount(f) + f.cat.size;
  const sidebar = (
    <Sidebar
      store={store}
      session={session}
      topics={topics}
      allCount={allTopicCount}
      selected={f.cat}
      onPickTopic={pickTopic}
      overall={overall}
      onExport={exportJson}
      onImportFile={importJson}
      onSignOut={onSignOut}
    />
  );

  return (
    <div className="min-h-dvh bg-canvas text-fg md:grid md:grid-cols-[17.5rem_minmax(0,1fr)]">
      {!mobile && <aside className="sticky top-0 h-dvh border-r border-line-soft">{sidebar}</aside>}
      <Sheet open={drawer && mobile} onClose={() => setDrawer(false)} side="left" title="Menu" hideTitle>
        {mobile && <div className="-mx-5 -mb-5 h-[calc(100dvh-1rem)]">{sidebar}</div>}
      </Sheet>

      <div className="min-w-0">
        <header ref={headerRef} className="sticky top-0 z-20 border-b border-line-soft bg-canvas/95 px-4 pt-3 pb-2.5 backdrop-blur supports-[backdrop-filter]:bg-canvas/80 md:px-6">
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost size-10 px-0 md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <label className="relative min-w-0 flex-1 md:max-w-md">
              <span className="sr-only">Search problems</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search title, number, tag…"
                className="field min-h-10 pl-9 md:min-h-9"
              />
              <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-micro text-fg-subtle md:block">/</kbd>
            </label>
            <button type="button" className="pill min-h-10 md:hidden" aria-pressed={filterCount > 0} onClick={() => setFilterSheet(true)}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters{filterCount > 0 && <span className="font-mono text-micro">{filterCount}</span>}
            </button>
            <p className="ml-auto hidden font-mono text-meta text-fg-subtle lg:block" aria-live="polite">
              {visible.length} of {data.items.length}
            </p>
          </div>
          <div className="mt-2.5 hidden md:block">
            <FilterBar f={f} setF={setF} counts={counts} platforms={platforms} companies={companies} missingLinkCount={missingLinkCount} />
          </div>
          <div className={filterCount || f.q ? 'mt-2' : ''}>
            <ActiveChips f={filters} setF={setF} onClearAll={clearAll} />
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className={`mx-4 mt-3 flex items-start gap-3 rounded-xl px-4 py-2.5 text-meta md:mx-6 ${notice.tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}
          >
            <span className="flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                store.clearRejection();
              }}
              aria-label="Dismiss"
              className="shrink-0"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <main className="px-0 pb-24 md:px-6">
          {!store.ready ? (
            <div className="px-4 py-24 text-center text-fg-muted" role="status">
              Loading your tracker…
            </div>
          ) : groups.length === 0 ? (
            <div className="mx-4 mt-10 rounded-2xl border border-dashed border-line px-6 py-16 text-center md:mx-0">
              <p className="font-serif text-2xl">Nothing matches</p>
              <p className="mt-2 text-fg-muted">Try removing a filter or searching for something else.</p>
              <button type="button" className="btn mt-5" onClick={clearAll}>
                Clear all filters
              </button>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.cat} aria-labelledby={`h-${g.cat}`} className="mt-5 first:mt-4">
                <h2
                  id={`h-${g.cat}`}
                  className="sticky top-[var(--header-h,0px)] z-10 flex items-baseline gap-3 bg-canvas/95 px-4 py-2 font-serif text-lg backdrop-blur md:px-1"
                >
                  {g.cat}
                  <span className="font-mono text-micro text-fg-subtle">
                    {g.solved}/{g.items.length}
                  </span>
                </h2>
                <ul className="border-y border-line-soft bg-panel md:rounded-xl md:border">
                  {g.items.map((p) => (
                    <ProblemRow
                      key={p.key}
                      p={p}
                      entry={store.entry(p.pk)}
                      hasNote={!!store.note(p.pk)}
                      form={rowForm?.key === p.key ? rowForm.mode : null}
                      onCheck={onCheck}
                      onOpen={onOpen}
                      onRevisit={onRevisit}
                      onAddLink={onAddLink}
                      onFormSubmit={onFormSubmit}
                      onFormCancel={onFormCancel}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </main>
      </div>

      <Sheet
        open={filterSheet && mobile}
        onClose={() => setFilterSheet(false)}
        side="bottom"
        title="Filters"
        footer={
          <>
            <button type="button" className="btn btn-ghost min-h-11" onClick={clearAll}>
              Clear
            </button>
            <button type="button" className="btn btn-primary min-h-11" onClick={() => setFilterSheet(false)}>
              Show {visible.length} problems
            </button>
          </>
        }
      >
        <FilterSheetBody f={f} setF={setF} counts={counts} platforms={platforms} companies={companies} missingLinkCount={missingLinkCount} cats={data.cats} />
      </Sheet>

      <DetailPanel problem={detail} store={store} mobile={mobile} onClose={() => setDetail(null)} onRequestUnsolve={setUnsolve} />

      <ConfirmDialog
        open={!!unsolve}
        title="Mark as unsolved?"
        confirmLabel="Mark unsolved"
        onCancel={() => setUnsolve(null)}
        onConfirm={() => {
          if (unsolve) store.markUnsolved(unsolve.pk);
          setUnsolve(null);
        }}
      >
        “{unsolve?.title}” will be unticked in “{store.activeVersion?.name}”. Its solution link is kept, so ticking it again pre-fills the link.
      </ConfirmDialog>
    </div>
  );
}
