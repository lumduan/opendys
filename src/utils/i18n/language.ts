// Pure i18n helpers — locale detection, persistence, and resolution.
// Lives under src/utils/** so the 90/90/90/80 coverage gate applies.
import type { Language } from '@/i18n/strings';

/** localStorage key for the persisted UI language (mirrors `opendys.<domain>.v<N>`). */
export const LANG_STORAGE_KEY = 'opendys.lang.v1';

/** Locales the UI ships in; also drives the toggle options. */
export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'th'];

interface StoredLang {
  readonly lang: Language;
  readonly v: 1;
}

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'th';
}

/** Pick a UI language from the browser's locale preference (`th-*` → Thai, else English). */
export function detectBrowserLanguage(): Language {
  try {
    const navLang = navigator.language;
    if (typeof navLang === 'string' && navLang.toLowerCase().startsWith('th')) {
      return 'th';
    }
  } catch {
    // navigator access can throw in some sandboxed environments — fall through to the default.
  }
  return 'en';
}

/** Parse + validate the persisted envelope; returns `null` if absent or malformed. */
export function parseStoredLang(raw: string | null): Language | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredLang>;
    if (parsed && parsed.v === 1 && isLanguage(parsed.lang)) {
      return parsed.lang;
    }
  } catch {
    // malformed JSON — treat as absent.
  }
  return null;
}

/** Serialize the language choice into the persisted envelope (round-trips with parseStoredLang). */
export function serializeLang(lang: Language): string {
  const envelope: StoredLang = { lang, v: 1 };
  return JSON.stringify(envelope);
}

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // private-mode Safari / disabled storage — treat as absent.
    return null;
  }
}

/**
 * Resolve the initial UI language: a persisted choice wins, otherwise the browser locale is detected,
 * otherwise English. Evaluated once at provider init.
 */
export function resolveInitialLanguage(): Language {
  const stored = parseStoredLang(safeLocalGet(LANG_STORAGE_KEY));
  return stored ?? detectBrowserLanguage();
}
