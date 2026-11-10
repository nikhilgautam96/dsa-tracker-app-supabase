import { memo } from 'react';
import { ExternalLink, Link2Off, NotebookPen, Star } from 'lucide-react';
import type { Entry, Problem } from '../lib/types';
import { SOURCE_SHORT, srcGroup } from '../lib/filters';
import { SolveForm } from './SolveForm';
import { LEVEL_DOT, LEVEL_TEXT } from '../lib/ui';


interface RowProps {
  p: Problem;
  entry: Entry;
  hasNote: boolean;
  /** inline form state for this row */
  form: 'solve' | 'link' | null;
  onCheck: (p: Problem) => void;
  onOpen: (p: Problem) => void;
  onRevisit: (p: Problem) => void;
  onAddLink: (p: Problem) => void;
  onFormSubmit: (p: Problem, url: string) => void;
  onFormCancel: () => void;
}

export const ProblemRow = memo(function ProblemRow({ p, entry, hasNote, form, onCheck, onOpen, onRevisit, onAddLink, onFormSubmit, onFormCancel }: RowProps) {
  const groups = [...new Set(p.sources.map(srcGroup))];
  const shown = groups.slice(0, 2);
  const solved = entry.solved;
  const needsLink = solved && entry.needsLink;
  const num = p.platform === 'LeetCode' ? `#${p.num}` : (p.num ?? p.platform);

  return (
    <li className="border-b border-line-soft last:border-b-0">
      <div
        className="group flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-hover sm:items-center sm:px-4"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a,button,input,label')) return;
          onOpen(p);
        }}
      >
        <input
          type="checkbox"
          checked={solved}
          onChange={() => onCheck(p)}
          aria-label={solved ? `Unmark ${p.title}` : `Mark ${p.title} solved (asks for a solution link)`}
          className="mt-0.5 size-4 shrink-0 sm:mt-0"
        />
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium decoration-line underline-offset-4 hover:underline ${solved ? 'text-fg-muted' : 'text-fg'}`}
            >
              {p.title}
            </a>
            <span className="ml-2 font-mono text-micro text-fg-subtle">{num}</span>
            {p.premium && (
              <span className="ml-2 text-micro text-medium" title="LeetCode Premium">
                Premium
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-0 sm:flex-nowrap">
            {p.level && (
              <span className={`inline-flex w-16 items-center gap-1.5 text-micro ${LEVEL_TEXT[p.level]}`} title={p.lvsrc}>
                <span className={`size-1.5 rounded-full ${LEVEL_DOT[p.level]}`} aria-hidden="true" />
                {p.level}
                {p.lvsrc.startsWith('estimate') && <span className="text-fg-subtle">est.</span>}
              </span>
            )}
            <span className="hidden w-[7.5rem] gap-1 md:flex" title={p.sources.join(', ')}>
              {shown.map((g) => (
                <span key={g} className="rounded border border-line-soft px-1.5 font-mono text-micro text-fg-subtle">
                  {SOURCE_SHORT[g] ?? g}
                </span>
              ))}
              {groups.length > 2 && <span className="font-mono text-micro text-fg-subtle">+{groups.length - 2}</span>}
            </span>
            <span className="flex w-24 items-center justify-end gap-1">
              {needsLink ? (
                <button type="button" onClick={() => onAddLink(p)} className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-micro text-warn hover:opacity-80">
                  <Link2Off className="size-3" aria-hidden="true" /> add link
                </button>
              ) : solved && entry.solutionUrl ? (
                <a
                  href={entry.solutionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-micro text-ok hover:underline"
                  title={entry.solutionUrl}
                >
                  solution <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </span>
            <span className="flex items-center gap-0.5">
              <span className={`grid size-7 place-items-center ${hasNote ? 'text-fg-muted' : 'invisible'}`} title="Has a note">
                <NotebookPen className="size-3.5" aria-label="Has a note" />
              </span>
              <button
                type="button"
                onClick={() => onRevisit(p)}
                aria-pressed={entry.revisit}
                aria-label={entry.revisit ? `Remove ${p.title} from revisit` : `Flag ${p.title} to revisit`}
                className={`grid size-7 place-items-center rounded-md hover:bg-surface ${entry.revisit ? 'text-accent' : 'text-fg-subtle opacity-60 group-hover:opacity-100 focus-visible:opacity-100'}`}
              >
                <Star className={`size-3.5 ${entry.revisit ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            </span>
          </div>
        </div>
      </div>
      {form && (
        <div className="px-3 pb-3 sm:pl-11">
          <SolveForm problem={p} initial={entry.solutionUrl} mode={form} onSubmit={(url) => onFormSubmit(p, url)} onCancel={onFormCancel} />
        </div>
      )}
    </li>
  );
});
