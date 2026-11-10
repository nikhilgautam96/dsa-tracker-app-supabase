import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Link2Off, Star, X } from 'lucide-react';
import type { Filters, Status } from '../lib/types';
import { LEVELS, SOURCE_GROUPS, STATUSES } from '../lib/filters';
import { MultiSelect } from './ui/MultiSelect';
import { LEVEL_DOT, toggleSet } from '../lib/ui';

export interface FacetCounts {
  cat: Record<string, number>;
  src: Record<string, number>;
  plat: Record<string, number>;
}

interface FilterProps {
  f: Filters;
  setF: Dispatch<SetStateAction<Filters>>;
  counts: FacetCounts;
  platforms: string[];
  missingLinkCount: number;
}


function StatusControl({ f, setF }: Pick<FilterProps, 'f' | 'setF'>) {
  return (
    <div role="group" aria-label="Status" className="inline-flex rounded-full border border-line p-0.5">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={f.status === s}
          onClick={() => setF((p) => ({ ...p, status: s as Status }))}
          className={`min-h-7 rounded-full px-3 text-meta transition-colors ${f.status === s ? 'bg-fg text-canvas' : 'text-fg-muted hover:text-fg'}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function LevelPills({ f, setF }: Pick<FilterProps, 'f' | 'setF'>) {
  return (
    <div role="group" aria-label="Difficulty" className="flex flex-wrap gap-1.5">
      {LEVELS.map((l) => (
        <button key={l} type="button" className="pill" aria-pressed={f.level.has(l)} onClick={() => setF((p) => ({ ...p, level: toggleSet(p.level, l) }))}>
          <span className={`size-2 rounded-full ${LEVEL_DOT[l]}`} aria-hidden="true" />
          {l}
        </button>
      ))}
    </div>
  );
}

function FlagPills({ f, setF, missingLinkCount }: Pick<FilterProps, 'f' | 'setF' | 'missingLinkCount'>) {
  return (
    <>
      <button type="button" className="pill" aria-pressed={f.revisit} onClick={() => setF((p) => ({ ...p, revisit: !p.revisit }))}>
        <Star className={`size-3.5 ${f.revisit ? 'fill-current' : ''}`} aria-hidden="true" />
        Revisit
      </button>
      {(missingLinkCount > 0 || f.missingLink) && (
        <button
          type="button"
          className="pill"
          aria-pressed={f.missingLink}
          onClick={() => setF((p) => ({ ...p, missingLink: !p.missingLink }))}
          title="Solved before links were required"
        >
          <Link2Off className="size-3.5" aria-hidden="true" />
          Missing link <span className="font-mono text-micro">{missingLinkCount}</span>
        </button>
      )}
    </>
  );
}

/** Desktop filter bar (inside the sticky top bar). */
export function FilterBar({ f, setF, counts, platforms, missingLinkCount }: FilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        label="Source"
        options={SOURCE_GROUPS}
        selected={f.src}
        counts={counts.src}
        onToggle={(v) => setF((p) => ({ ...p, src: toggleSet(p.src, v) }))}
        onClear={() => setF((p) => ({ ...p, src: new Set() }))}
      />
      <MultiSelect
        label="Platform"
        options={platforms}
        selected={f.plat}
        counts={counts.plat}
        onToggle={(v) => setF((p) => ({ ...p, plat: toggleSet(p.plat, v) }))}
        onClear={() => setF((p) => ({ ...p, plat: new Set() }))}
      />
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <StatusControl f={f} setF={setF} />
      <LevelPills f={f} setF={setF} />
      <FlagPills f={f} setF={setF} missingLinkCount={missingLinkCount} />
    </div>
  );
}

/** Removable chips for the active filters (shown under the bar). */
export function ActiveChips({ f, setF, onClearAll }: Pick<FilterProps, 'f' | 'setF'> & { onClearAll: () => void }) {
  const chips: { label: string; remove: () => void }[] = [
    ...[...f.cat].map((c) => ({ label: c, remove: () => setF((p) => ({ ...p, cat: toggleSet(p.cat, c) })) })),
    ...[...f.src].map((s) => ({ label: s, remove: () => setF((p) => ({ ...p, src: toggleSet(p.src, s) })) })),
    ...[...f.plat].map((s) => ({ label: s, remove: () => setF((p) => ({ ...p, plat: toggleSet(p.plat, s) })) })),
    ...[...f.level].map((l) => ({ label: l, remove: () => setF((p) => ({ ...p, level: toggleSet(p.level, l) })) })),
    ...(f.status !== 'All' ? [{ label: f.status, remove: () => setF((p) => ({ ...p, status: 'All' as Status })) }] : []),
    ...(f.revisit ? [{ label: 'Revisit', remove: () => setF((p) => ({ ...p, revisit: false })) }] : []),
    ...(f.missingLink ? [{ label: 'Missing link', remove: () => setF((p) => ({ ...p, missingLink: false })) }] : []),
    ...(f.q ? [{ label: `“${f.q}”`, remove: () => setF((p) => ({ ...p, q: '' })) }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.remove}
          className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-micro text-fg hover:bg-line-soft"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 text-micro text-accent underline">
        Clear all
      </button>
    </div>
  );
}

/** Mobile: every filter in one scrollable sheet body (topics included). */
export function FilterSheetBody({ f, setF, counts, platforms, missingLinkCount, cats }: FilterProps & { cats: string[] }) {
  const section = (title: string, children: ReactNode) => (
    <section className="py-3">
      <h3 className="label-micro mb-2">{title}</h3>
      {children}
    </section>
  );
  const pills = (key: 'cat' | 'src' | 'plat', options: readonly string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {options
        .filter((o) => (counts[key][o] ?? 0) > 0 || f[key].has(o))
        .map((o) => (
          <button key={o} type="button" className="pill min-h-10" aria-pressed={f[key].has(o)} onClick={() => setF((p) => ({ ...p, [key]: toggleSet(p[key], o) }))}>
            {o} <span className="font-mono text-micro opacity-70">{counts[key][o] ?? 0}</span>
          </button>
        ))}
    </div>
  );
  return (
    <div className="divide-y divide-line-soft">
      {section('Status', <StatusControl f={f} setF={setF} />)}
      {section('Difficulty', <LevelPills f={f} setF={setF} />)}
      {section(
        'Flags',
        <div className="flex flex-wrap gap-1.5">
          <FlagPills f={f} setF={setF} missingLinkCount={missingLinkCount} />
        </div>,
      )}
      {section('Topics', pills('cat', cats))}
      {section('Source', pills('src', SOURCE_GROUPS))}
      {section('Platform', pills('plat', platforms))}
    </div>
  );
}
