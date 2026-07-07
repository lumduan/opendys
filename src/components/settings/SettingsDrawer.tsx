import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from '@/context/i18nContext';
import { SUPPORTED_LANGUAGES } from '@/utils/i18n';
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
  const i18n = useTranslation();
  const t = i18n.t.settings;
  const { lang, setLang } = i18n;
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
        <label className="form-control mb-4">
          <span className="label-text mb-1">{t.language}</span>
          <select
            className="select select-bordered select-sm"
            value={lang}
            onChange={(event) => setLang(event.target.value === 'th' ? 'th' : 'en')}
            data-testid="language-select"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {code === 'th' ? t.languageThai : t.languageEnglish}
              </option>
            ))}
          </select>
        </label>
        <TypographyPanel />
      </aside>
    </>
  );
}
