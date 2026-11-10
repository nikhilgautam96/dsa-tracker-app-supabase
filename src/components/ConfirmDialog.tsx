import type { ReactNode } from 'react';
import { Sheet } from './ui/Sheet';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      side="center"
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-meta text-fg-muted">{children}</div>
    </Sheet>
  );
}
