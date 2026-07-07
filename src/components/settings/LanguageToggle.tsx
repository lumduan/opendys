import { useTranslation } from '@/context/i18nContext';

/** Compact navbar EN/TH shortcut — one tap toggles the UI language (persisted by the provider). */
export function LanguageToggle() {
  const { lang, toggle, t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-circle hidden text-xs font-semibold min-[400px]:inline-flex"
      onClick={toggle}
      aria-label={t.settings.languageToggleAria}
      data-testid="language-toggle"
    >
      {lang === 'th' ? 'TH' : 'EN'}
    </button>
  );
}
