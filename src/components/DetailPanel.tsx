import { useEffect, useRef, useState } from 'react';
import { ExternalLink, PlayCircle, Star } from 'lucide-react';
import type { Problem } from '../lib/types';
import type { TrackerStore } from '../lib/trackerStore';
import { UserFacingError } from '../lib/trackerStore';
import { shortUrl } from '../lib/solutionUrl';
import { Sheet } from './ui/Sheet';
import { SolveForm } from './SolveForm';
import { LEVEL_DOT, LEVEL_TEXT } from '../lib/ui';

const MATCH: Record<string, string | undefined> = {
  best: "Closest match. Pepcoding's own judge is offline, so this links the most plausible original or an equivalent problem.",
  practice: 'Concept video. The link is a standard practice problem for the concept taught in the video.',
  concept: 'Theory lesson. There is no judge problem; the link opens the video.',
  search: 'The original problem could not be identified; the link opens a search.',
};

function levelSource(p: Problem): string {
  if (!p.level) return '';
  if (p.lvsrc.startsWith('via LeetCode')) return `Difficulty referenced from LeetCode: ${p.lvsrc.replace('via LeetCode ', '')}`;
  if (p.lvsrc.startsWith('AtCoder Problems')) return `Difficulty referenced from AtCoder Problems (kenkoooo) estimate ${p.lvsrc.split(' ').pop()}`;
  if (p.lvsrc.startsWith('Pepcoding')) return `Difficulty referenced from Pepcoding's label (${p.platform} has no rating)`;
  if (p.lvsrc.startsWith('estimate')) return `Estimated — ${p.platform} has no rating and no comparable rated problem was found`;
  return p.lvsrc === 'LeetCode' ? '' : p.lvsrc;
}

interface DetailPanelProps {
  problem: Problem | null;
  store: TrackerStore;
  mobile: boolean;
  onClose: () => void;
  onRequestUnsolve: (p: Problem) => void;
}

export function DetailPanel({ problem, store, mobile, onClose, onRequestUnsolve }: DetailPanelProps) {
  return (
    <Sheet open={!!problem} onClose={onClose} side={mobile ? 'bottom' : 'right'} title={problem?.title ?? 'Problem'}>
      {problem && <DetailBody key={problem.key} p={problem} store={store} onRequestUnsolve={onRequestUnsolve} />}
    </Sheet>
  );
}

function DetailBody({ p, store, onRequestUnsolve }: { p: Problem; store: TrackerStore; onRequestUnsolve: (p: Problem) => void }) {
  const entry = store.entry(p.pk);
  const [form, setForm] = useState<'solve' | 'link' | null>(null);
  const [error, setError] = useState('');
  const ref = levelSource(p);

  const submit = (url: string) => {
    try {
      if (form === 'solve') store.markSolved(p.pk, url);
      else store.setSolutionUrl(p.pk, url);
      setForm(null);
      setError('');
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : 'Could not save.');
    }
  };

  return (
    <div className="space-y-6 pt-1">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-fg-muted">
          <span className="font-mono">{p.platform === 'LeetCode' ? `LeetCode #${p.num}` : (p.num ?? p.platform)}</span>
          {p.level && (
            <span className={`inline-flex items-center gap-1.5 ${LEVEL_TEXT[p.level]}`}>
              <span className={`size-2 rounded-full ${LEVEL_DOT[p.level]}`} aria-hidden="true" />
              {p.level}
            </span>
          )}
          {/^\d+$/.test(p.diff) && p.platform !== 'LeetCode' && <span className="font-mono">rating {p.diff}</span>}
          {p.premium && <span className="text-medium">LeetCode Premium</span>}
        </div>
        {ref && <p className="mt-1 text-micro text-fg-subtle">{ref}</p>}
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn mt-3">
          Open problem <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      <section aria-labelledby="sol-h">
        <h3 id="sol-h" className="label-micro mb-2">
          Solution · {store.activeVersion?.name}
        </h3>
        {form ? (
          <SolveForm problem={p} initial={entry.solutionUrl} mode={form} onSubmit={submit} onCancel={() => setForm(null)} />
        ) : entry.solved ? (
          <div className="rounded-xl border border-line p-3">
            {entry.needsLink ? (
              <p className="text-meta text-warn">Solved before links were required. Add your solution link to complete it.</p>
            ) : (
              <a href={entry.solutionUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-meta break-all text-ok underline">
                {shortUrl(entry.solutionUrl ?? '')} <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
            )}
            {entry.solvedAt && <p className="mt-1 text-micro text-fg-subtle">Solved {new Date(entry.solvedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn" onClick={() => setForm('link')}>
                {entry.needsLink ? 'Add link' : 'Edit link'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onRequestUnsolve(p)}>
                Mark unsolved
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setForm('solve')}>
            Mark solved…
          </button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-meta text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
        <span>
          <span className="block text-meta font-medium">Revisit</span>
          <span className="block text-micro text-fg-subtle">Flag it to come back to in this version</span>
        </span>
        <button type="button" className="pill" aria-pressed={entry.revisit} onClick={() => store.toggleRevisit(p.pk)}>
          <Star className={`size-3.5 ${entry.revisit ? 'fill-current' : ''}`} aria-hidden="true" />
          {entry.revisit ? 'Flagged' : 'Flag'}
        </button>
      </section>

      <NotesEditor pk={p.pk} store={store} />

      <section className="space-y-3 text-meta">
        <h3 className="label-micro">Details</h3>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2">
          <dt className="text-fg-subtle">Topic</dt>
          <dd>{p.cat}</dd>
          <dt className="text-fg-subtle">Sources</dt>
          <dd>{p.sources.join(' · ')}</dd>
          {p.tags.length > 0 && (
            <>
              <dt className="text-fg-subtle">Tags</dt>
              <dd>{p.tags.join(' · ')}</dd>
            </>
          )}
          {p.notes.length > 0 && (
            <>
              <dt className="text-fg-subtle">Why</dt>
              <dd>{p.notes.join(' — ')}</dd>
            </>
          )}
          {MATCH[p.conf] && (
            <>
              <dt className="text-fg-subtle">Link match</dt>
              <dd>{MATCH[p.conf]}</dd>
            </>
          )}
        </dl>
        {p.videos.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-fg-subtle">Pepcoding video{p.videos.length > 1 ? 's' : ''}</h4>
            <ul className="space-y-1.5">
              {p.videos.map((v) => (
                <li key={v.u}>
                  <a href={v.u} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 hover:underline">
                    <PlayCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>
                      {v.t}
                      <span className="block text-micro text-fg-subtle">{v.p}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/** Notes are shared across versions; autosaved shortly after you stop typing. */
function NotesEditor({ pk, store }: { pk: string; store: TrackerStore }) {
  const [text, setText] = useState(() => store.note(pk));
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onChange = (v: string) => {
    setText(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      store.setNote(pk, v);
      setSaved(true);
    }, 600);
  };

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={`note-${pk}`} className="label-micro">
          Notes · all versions
        </label>
        <span className="text-micro text-fg-subtle" aria-live="polite">
          {saved ? (text ? 'Saved' : '') : 'Saving…'}
        </span>
      </div>
      <textarea
        id={`note-${pk}`}
        value={text}
        maxLength={10000}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!saved) {
            if (timer.current) clearTimeout(timer.current);
            store.setNote(pk, text);
            setSaved(true);
          }
        }}
        rows={6}
        placeholder="Approach, complexity, the edge case that tripped you up…"
        className="field min-h-36 resize-y leading-relaxed"
      />
    </section>
  );
}
