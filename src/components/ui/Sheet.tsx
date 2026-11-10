import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Side = 'right' | 'left' | 'bottom' | 'center';

const PANEL: Record<Side, string> = {
  right: 'ml-auto h-dvh max-h-dvh w-full max-w-[34rem] border-l',
  left: 'mr-auto h-dvh max-h-dvh w-[19rem] max-w-[85vw] border-r',
  bottom: 'mt-auto w-full max-h-[88dvh] rounded-t-2xl border-t',
  center: 'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border',
};

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title: string;
  /** visually hide the title (still read by screen readers) */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Modal panel built on the native <dialog>: focus moves inside, Esc closes, the page behind is inert,
 * and focus returns to the element that opened it.
 */
export function Sheet({ open, onClose, side = 'right', title, hideTitle, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className={`fixed inset-0 m-0 h-auto max-h-none w-auto max-w-none bg-transparent p-0 text-fg backdrop:bg-black/35 backdrop:backdrop-blur-[1px] open:flex ${side === 'bottom' ? 'items-end' : ''}`}
    >
      <div className={`flex flex-col overflow-hidden border-line bg-canvas shadow-xl ${PANEL[side]}`}>
        <div className={`flex items-center gap-3 px-5 pt-4 pb-3 ${hideTitle ? 'sr-only' : ''}`}>
          <h2 className="min-w-0 flex-1 font-serif text-xl leading-tight">{title}</h2>
          <button type="button" className="btn btn-ghost -mr-2 size-9 px-0" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">{footer}</div>}
      </div>
    </dialog>
  );
}
