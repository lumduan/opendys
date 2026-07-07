# WBS — Internationalization / Language Switcher

Decomposes the i18n phase into tasks. Status uses the [standard legend](../README.md#status-legend). Maps
to **Phase 9** in the [ROADMAP](../ROADMAP.md#phase-9--i18n--language-switcher). See
[frd.md](./frd.md) / [hld.md](./hld.md). _Shipped in **v1.7.0**._

## P1 — Core provider, hook & helpers

- [x] `src/utils/i18n/language.ts` — `LANG_STORAGE_KEY`, `detectBrowserLanguage`, `parseStoredLang`,
      `serializeLang`, `resolveInitialLanguage` (+ the `{ lang, v: 1 }` envelope)
- [x] `src/utils/i18n/index.ts` barrel; co-located `language.test.ts` (clears the 90/80 coverage gate —
      see [Test spec](#test-spec--srcutilsi18nlanguagetest) below)
- [x] `src/context/i18nContext.ts` — `I18nContext` + `useTranslation()` (component-free module)
- [x] `src/context/I18nProvider.tsx` — lazy `resolveInitialLanguage()` init, immediate persist,
      `document.documentElement.lang` effect, memoized value (mirrors `SettingsProvider`)
- [x] Wire `<I18nProvider>` into `src/main.tsx` (wrapping `<SettingsProvider>`)

## P2 — Harden the schema & externalize bypass strings

- [x] Retype `OcrStrings.errors` → `Record<OcrErrorKey, string>`;
      `OcrStrings.progress` → `Record<OcrProgressMessageKey, string> & { cancel }`;
      `AsrStrings.errors` → `Record<AsrErrorKey, string>` (import the enums)
- [x] Extend `UIStrings` + populate **both** `en` and `th` for the ~25 bypass strings and toggle labels:
  - home: `previewColors`, `previewAsr`, `statusNote`, `badgeEnglish`, `badgeThai`
  - `ui.loading`; `reader.homeLink`, `ocr.homeLink` (or reuse `asr.homeLink`)
  - `asr.saved`, `asr.modeAriaLabel`; `settings.rulerAriaLabel`
  - toggle: `settings.language`, `settings.langEnglish`, `settings.langThai`,
    `settings.langToggleAria` (navbar shortcut)
  - `thaiDemo.*` namespace (title, placeholder, legend)
- [x] **Hybrid cleanup:** drop parenthetical Thai from `en.*` chrome — `asr.practice` →
      `'Practice reading'`, `*.langThai` → `'Thai'`, etc. (clean Thai values already exist in
      `strings.th`)

## P3 — Component-by-component swap (the 16 sites)

- [x] `layouts/RootLayout.tsx` (navbar labels, offline badge, footer, loading aria) — also hosts the
      navbar shortcut in P4
- [x] `pages/HomePage.tsx` (hero, pillars, CTAs, status note, badges)
- [x] `pages/ReaderPage.tsx` (page intro, placeholder, sample, `← Home`)
- [x] `pages/OcrPage.tsx` (title, intro, tabs, errors, `← Home`)
- [x] `pages/AsrPlaygroundPage.tsx` (title, intro, labels, `Saved to history…`, `← Home`)
- [x] `components/reader/Reader.tsx` (reader + asr namespaces; practice toolbar; statuses; gauge;
      errors; `practice mode` aria)
- [x] `components/reader/ReadingRuler.tsx` (`Reading ruler` aria)
- [x] `components/ocr/{OcrResult,OcrProgress,CapturePanel,EngineToggle,LanguageSelect,UploadDropzone}.tsx`
- [x] `components/settings/{SettingsButton,SettingsDrawer,TypographyPanel}.tsx`

## P4 — Toggle UI

- [x] Settings drawer: Language control (labeled `select`) bound to `setLang` (driven by
      `SUPPORTED_LANGUAGES`)
- [x] Navbar: compact `EN` / `TH` shortcut (`LanguageToggle`) bound to `toggle` (sized for 360 px)

## P5 — a11y, `<html lang>`, layout audit

- [x] Confirm `document.documentElement.lang` updates on toggle and on init (provider RTL test)
- [~] 360 px audit: navbar + reader toolbar wrap cleanly under Thai; no overflow — **pending a real
      browser** (no headless browser in CI)
- [~] axe-core sweep of the new toggle (keyboard-reachable, name, role) — **pending**

## P6 — Dev-page localization (final stretch, low priority)

- [x] `/dev/thai-colors` (`ThaiColorDemoPage.tsx`): heading, placeholder, legend via `thaiDemo.*`
- [x] `/dev/asr-playground` (`AsrPlaygroundPage.tsx`): remaining literals via `asr.*`

## P7 — Verification & release

- [x] `npm run typecheck` green — the `Record<Language, UIStrings>` + `Record<…Key, string>` schema
      enforces en/th parity and enum↔dict parity at compile time
- [x] `npm run test:run` green (helpers ≥ 90%; provider RTL test) — **255 tests**
- [x] `npm run lint && npm run build` green; SW precache still bundles the dict
- [~] Browser verify: toggle EN ⇄ TH on `/reader` + OCR result + an error alert; persistence across
      reload; first-visit `th-*` detection; `grep -rn "strings\.en" src/` returns 0 migrated sites —
      grep audit done (0 sites); **live-browser toggle pending** (no headless browser in CI)
- [x] Update CHANGELOG; `v1.7.0` release (tag → `release.yml` → GHCR `:v1.7.0` + `:latest`)

## Test spec — `src/utils/i18n/language.test.ts`

- `detectBrowserLanguage`: `'th-TH'` → `'th'`, `'th'` → `'th'`, `'en-US'` → `'en'`, `''` → `'en'`,
  `undefined` / thrown → `'en'`
- `parseStoredLang`: `'{"lang":"en","v":1}'` → `'en'`, `'{"lang":"th","v":1}'` → `'th'`,
  `'{"lang":"de","v":1}'` → `null`, `'garbage'` → `null`, `null` → `null`, wrong `v` → `null`
- `resolveInitialLanguage`: stored wins over browser; browser wins over default; nothing stored +
  non-`th` browser → `'en'`; nothing stored + `th` browser → `'th'`
- `serializeLang`: round-trips through `parseStoredLang`
- Provider RTL test (`src/context/I18nProvider.test.tsx`): default renders English; `setLang('th')`
  re-renders Thai text and writes `opendys.lang.v1`; `document.documentElement.lang === 'th'`; pre-seeded
  storage is honored on mount
