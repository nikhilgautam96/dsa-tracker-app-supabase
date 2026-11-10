import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  counts?: Record<string, number>;
  onToggle: (v: string) => void;
  onClear: () => void;
}

/** Compact dropdown of checkable options with live counts. Esc / outside click closes; focus returns to the trigger. */
export function MultiSelect({ label, options, selected, counts, onToggle, onClear }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        className="pill"
        aria-pressed={selected.size > 0}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.size > 0 && <span className="font-mono text-micro">{selected.size}</span>}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="thin-scroll absolute top-full left-0 z-30 mt-1.5 max-h-80 w-60 overflow-y-auto rounded-xl border border-line bg-panel p-1.5 shadow-lg"
        >
          {options.map((o) => {
            const on = selected.has(o);
            const n = counts?.[o] ?? 0;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(o)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-meta hover:bg-hover ${n === 0 && !on ? 'text-fg-subtle' : 'text-fg'}`}
              >
                <span className={`grid size-4 place-items-center rounded border ${on ? 'border-accent bg-accent text-canvas' : 'border-line'}`}>
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="flex-1 truncate">{o}</span>
                <span className="font-mono text-micro text-fg-subtle">{n}</span>
              </button>
            );
          })}
          {selected.size > 0 && (
            <button type="button" onClick={onClear} className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-meta text-accent hover:bg-hover">
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
