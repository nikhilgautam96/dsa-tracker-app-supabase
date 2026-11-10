import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronsUpDown, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TrackerStore } from '../lib/trackerStore';
import { UserFacingError } from '../lib/trackerStore';
import { Sheet } from './ui/Sheet';
import { ConfirmDialog } from './ConfirmDialog';

const MAX_VERSIONS = 5;

export function VersionSwitcher({ store }: { store: TrackerStore }) {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = store.activeVersion;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
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
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-left hover:bg-hover"
      >
        <Layers className="size-4 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="label-micro block leading-none">Version</span>
          <span className="block truncate text-meta font-medium">{active?.name ?? 'Loading…'}</span>
        </span>
        <ChevronsUpDown className="size-4 text-fg-subtle" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full right-0 left-0 z-30 mt-1.5 rounded-xl border border-line bg-panel p-1.5 shadow-lg">
          {store.versions.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === store.activeVersionId}
              onClick={() => {
                void store.switchVersion(v.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta hover:bg-hover"
            >
              <Check className={`size-3.5 ${v.id === store.activeVersionId ? 'text-accent' : 'invisible'}`} aria-hidden="true" />
              <span className="flex-1 truncate">{v.name}</span>
            </button>
          ))}
          <div className="my-1 border-t border-line-soft" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setManage(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta text-fg-muted hover:bg-hover hover:text-fg"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Manage versions…
          </button>
        </div>
      )}
      <ManageVersions store={store} open={manage} onClose={() => setManage(false)} />
    </div>
  );
}

function ManageVersions({ store, open, onClose }: { store: TrackerStore; open: boolean; onClose: () => void }) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : 'Something went wrong. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => store.createVersion(newName))) setNewName('');
  };
  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (editing && (await run(() => store.renameVersion(editing, editName)))) setEditing(null);
  };
  const victim = store.versions.find((v) => v.id === toDelete);
  const atLimit = store.versions.length >= MAX_VERSIONS;

  return (
    <>
      <Sheet open={open} onClose={onClose} side="center" title="Versions">
        <p className="text-meta text-fg-muted">
          Each version is a separate round of tracking with its own solved problems, solution links and revisit flags. Notes are shared. Up to {MAX_VERSIONS}.
        </p>
        <ul className="mt-4 divide-y divide-line-soft rounded-xl border border-line">
          {store.versions.map((v) => (
            <li key={v.id} className="flex items-center gap-2 px-3 py-2">
              {editing === v.id ? (
                <form onSubmit={rename} className="flex flex-1 gap-2">
                  <input
                    className="field py-1.5"
                    value={editName}
                    maxLength={40}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label={`New name for ${v.name}`}
                    autoFocus
                  />
                  <button className="btn" type="submit" disabled={busy}>
                    Save
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-meta">
                    {v.name}
                    {v.id === store.activeVersionId && <span className="ml-2 label-micro text-accent">active</span>}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost size-8 px-0"
                    aria-label={`Rename ${v.name}`}
                    onClick={() => {
                      setEditing(v.id);
                      setEditName(v.name);
                      setError('');
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost size-8 px-0 text-danger"
                    aria-label={`Delete ${v.name}`}
                    disabled={store.versions.length <= 1}
                    title={store.versions.length <= 1 ? "You can't delete your only version" : undefined}
                    onClick={() => setToDelete(v.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={create} className="mt-4 flex gap-2">
          <input
            className="field"
            placeholder={atLimit ? 'Limit of 5 reached' : 'New version name, e.g. Revision Jan'}
            value={newName}
            maxLength={40}
            disabled={atLimit}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New version name"
          />
          <button className="btn btn-primary shrink-0" type="submit" disabled={busy || atLimit || !newName.trim()}>
            <Plus className="size-4" aria-hidden="true" /> Create
          </button>
        </form>
        <p className="mt-2 text-micro text-fg-subtle">A new version starts from zero and becomes active.</p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-meta text-warn">
            {error}
          </p>
        )}
      </Sheet>
      <ConfirmDialog
        open={!!victim}
        title={`Delete “${victim?.name ?? ''}”?`}
        confirmLabel="Delete permanently"
        danger
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete && (await run(() => store.deleteVersion(toDelete)))) setToDelete(null);
        }}
      >
        This permanently deletes the version’s solved problems, solution links and revisit flags. It can’t be undone. Notes are kept.
      </ConfirmDialog>
    </>
  );
}
