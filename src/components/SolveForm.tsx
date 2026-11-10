import { useId, useState, type FormEvent } from 'react';
import { ClipboardPaste, Link2 } from 'lucide-react';
import type { Problem } from '../lib/types';
import { solutionTemplate, validateSolutionUrl } from '../lib/solutionUrl';

interface SolveFormProps {
  problem: Problem;
  /** previously stored link (kept when unticking) */
  initial: string | null;
  mode: 'solve' | 'link';
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

/** Inline form under a row: a problem can only be marked solved with a valid solution link. */
export function SolveForm({ problem, initial, mode, onSubmit, onCancel }: SolveFormProps) {
  const [value, setValue] = useState(initial || solutionTemplate(problem));
  const [touched, setTouched] = useState(false);
  const [pasteError, setPasteError] = useState('');
  const id = useId();
  const check = validateSolutionUrl(value, problem);
  const showError = touched && !check.ok;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (check.ok) onSubmit(check.url);
  };

  const paste = async () => {
    setPasteError('');
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setValue(text);
        setTouched(true);
      }
    } catch {
      setPasteError('Clipboard access was blocked — paste with ⌘/Ctrl+V instead.');
    }
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="rounded-xl border border-line bg-panel p-3"
    >
      <label htmlFor={id} className="flex items-center gap-1.5 text-meta font-medium">
        <Link2 className="size-3.5 text-accent" aria-hidden="true" />
        {mode === 'solve' ? 'Solution link — required to mark solved' : 'Add your solution link'}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          className={`field font-mono ${showError ? 'border-danger' : ''}`}
          placeholder="https://leetcode.com/problems/…/submissions/123456789/"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value && setTouched(true)}
          onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
          aria-invalid={showError}
          aria-describedby={`${id}-hint`}
        />
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn" onClick={paste} title="Paste from clipboard">
            <ClipboardPaste className="size-4" aria-hidden="true" />
            <span className="sm:sr-only">Paste</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!check.ok}>
            {mode === 'solve' ? 'Mark solved' : 'Save link'}
          </button>
        </div>
      </div>
      <p id={`${id}-hint`} className={`mt-1.5 text-micro ${showError || pasteError ? 'text-danger' : 'text-fg-subtle'}`} aria-live="polite">
        {pasteError || (showError && !check.ok ? check.error : 'Any https:// link: a LeetCode submission, GitHub file, gist, Codeforces submission, Notion page…')}
      </p>
    </form>
  );
}
