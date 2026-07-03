import { useEffect, useRef, type RefObject } from 'react';
import { strings } from '@/i18n/strings';
import { TypographyPanel } from './TypographyPanel';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Non-modal settings drawer: the reader updates live behind it (no focus trap so the reader stays
 * reachable), but focus is managed — first control focused on open, Esc closes and restores focus to
 * the gear. Rendered only when open, so its controls never sit off-screen in the tab order.
 */
export function SettingsDrawer({ open, onClose, returnFocusRef }: SettingsDrawerProps) {
  const t = strings.en.settings;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        returnFocusRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  const close = () => {
    onClose();
    returnFocusRef.current?.focus();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] overflow-y-auto bg-base-100 p-5 shadow-xl"
        role="dialog"
        aria-label={t.title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.title}</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={close}>
            {t.close}
          </button>
        </div>
        <TypographyPanel />
      </aside>
    </>
  );
}
