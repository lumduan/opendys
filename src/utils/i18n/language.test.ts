import {
  LANG_STORAGE_KEY,
  detectBrowserLanguage,
  parseStoredLang,
  resolveInitialLanguage,
  serializeLang,
} from './language';

function setBrowserLanguage(value: string | undefined): void {
  // jsdom exposes navigator.language as a configurable getter.
  Object.defineProperty(navigator, 'language', { value, configurable: true });
}

describe('detectBrowserLanguage', () => {
  afterEach(() => setBrowserLanguage('en-US'));

  it('returns "th" for a Thai locale', () => {
    setBrowserLanguage('th-TH');
    expect(detectBrowserLanguage()).toBe('th');
  });

  it('returns "th" for bare "th"', () => {
    setBrowserLanguage('th');
    expect(detectBrowserLanguage()).toBe('th');
  });

  it('returns "en" for an English locale', () => {
    setBrowserLanguage('en-US');
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('defaults to "en" when the locale is empty', () => {
    setBrowserLanguage('');
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('defaults to "en" when navigator.language is undefined', () => {
    setBrowserLanguage(undefined);
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('defaults to "en" if navigator.language access throws', () => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      get() {
        throw new Error('sandboxed');
      },
    });
    expect(detectBrowserLanguage()).toBe('en');
  });
});

describe('parseStoredLang', () => {
  it('parses a valid English envelope', () => {
    expect(parseStoredLang(serializeLang('en'))).toBe('en');
  });

  it('parses a valid Thai envelope', () => {
    expect(parseStoredLang(serializeLang('th'))).toBe('th');
  });

  it('rejects an unsupported language', () => {
    expect(parseStoredLang(JSON.stringify({ lang: 'de', v: 1 }))).toBeNull();
  });

  it('rejects a wrong schema version', () => {
    expect(parseStoredLang(JSON.stringify({ lang: 'en', v: 2 }))).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(parseStoredLang('not-json')).toBeNull();
  });

  it('returns null for a null input', () => {
    expect(parseStoredLang(null)).toBeNull();
  });
});

describe('serializeLang', () => {
  it('round-trips through parseStoredLang', () => {
    const langs = ['en', 'th'] as const;
    for (const lang of langs) {
      expect(parseStoredLang(serializeLang(lang))).toBe(lang);
    }
  });
});

describe('resolveInitialLanguage', () => {
  afterEach(() => {
    localStorage.clear();
    setBrowserLanguage('en-US');
    vi.restoreAllMocks();
  });

  it('a stored choice wins over the browser locale', () => {
    setBrowserLanguage('th-TH');
    localStorage.setItem(LANG_STORAGE_KEY, serializeLang('en'));
    expect(resolveInitialLanguage()).toBe('en');
  });

  it('falls back to the browser locale when nothing is stored', () => {
    setBrowserLanguage('th-TH');
    expect(resolveInitialLanguage()).toBe('th');
  });

  it('falls back to English for a non-Thai browser when nothing is stored', () => {
    setBrowserLanguage('en-US');
    expect(resolveInitialLanguage()).toBe('en');
  });

  it('ignores a malformed stored value and uses the browser locale', () => {
    setBrowserLanguage('th-TH');
    localStorage.setItem(LANG_STORAGE_KEY, 'garbage');
    expect(resolveInitialLanguage()).toBe('th');
  });

  it('ignores a throwing localStorage and uses the browser locale', () => {
    setBrowserLanguage('th-TH');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(resolveInitialLanguage()).toBe('th');
  });
});
