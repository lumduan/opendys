import { createContext, useContext } from 'react';
import { strings, type Language, type UIStrings } from '@/i18n/strings';

export interface I18nContextValue {
  /** Active UI language. */
  lang: Language;
  /** Switch language (updates state + persists immediately). */
  setLang: (lang: Language) => void;
  /** Flip between the two locales (navbar shortcut). */
  toggle: () => void;
  /** The active language's full string tree. */
  t: UIStrings;
}

// Component-free module (context + hook) so react-refresh/only-export-components stays satisfied.
export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  toggle: () => {},
  t: strings.en,
});

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}
