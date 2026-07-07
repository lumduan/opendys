import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { strings, type Language } from '@/i18n/strings';
import { LANG_STORAGE_KEY, resolveInitialLanguage, serializeLang } from '@/utils/i18n';
import { I18nContext, type I18nContextValue } from './i18nContext';

function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private-mode Safari / disabled storage — ignore.
  }
}

function otherLanguage(lang: Language): Language {
  return lang === 'en' ? 'th' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => resolveInitialLanguage());

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    safeLocalSet(LANG_STORAGE_KEY, serializeLang(next));
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = otherLanguage(prev);
      safeLocalSet(LANG_STORAGE_KEY, serializeLang(next));
      return next;
    });
  }, []);

  // Keep the document language in sync (a11y pronunciation + the :lang(en) font rule).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, toggle, t: strings[lang] }),
    [lang, setLang, toggle],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
