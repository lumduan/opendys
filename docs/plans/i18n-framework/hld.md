# HLD — Internationalization / Language Switcher

High-Level Design for the i18n layer. See [frd.md](./frd.md) for requirements and [wbs.md](./wbs.md) for
the task breakdown. This blueprint unblocks the code phase; **no `src/` changes are made in the docs
pass.**

## 1. Purpose & scope

Deliver a lightweight, dependency-free i18n layer by activating the existing bilingual dictionary
(`src/i18n/strings.ts`) through a React context provider, rather than introducing `react-i18next` /
`react-intl` / `lingui`. The typed dictionary already gives compile-time missing-key detection for free,
so a third-party lib would add bundle weight and an offline-egress surface for no benefit.

**In scope:** a `LanguageProvider` + `useTranslation()` hook mirroring `SettingsProvider`; pure helpers
under `src/utils/i18n/`; enum↔dict type hardening; the 16-site consumer swap; the EN ⇄ TH toggle UI
(drawer + navbar); `<html lang>` sync; dev-page localization.

**Out of scope (this docs pass):** any `src/` code change — the code lands in the WBS phase this
blueprint unblocks. Dynamic `<title>` / meta description (CSR-only, low impact) and the build-static PWA
manifest `lang` are noted as optional follow-ups.

## 2. Architectural constraints (non-negotiable)

- **No third-party i18n library.** The typed `Record<Language, UIStrings>` dictionary is the source of
  truth; `tsc` enforces completeness (no scanner, no codegen).
- **Mirror the split-file context pattern** mandated by ESLint `react-refresh/only-export-components`:
  context + hook in a component-free module (`…Context.ts`); the provider component in its own `.tsx`.
- **Strict TS, no `any`**; `tsc -b && vite build` green; PWA offline shell intact; no new egress.
- **Offline-first:** the dictionary ships inside the JS bundle, which `vite-plugin-pwa` already precaches
  (`globPatterns: ['**/*.{js,css,html,woff2}']`). Nothing extra to cache.
- **No RTL** (Thai is LTR); **fonts already i18n-ready** (Sarabun/Mitr Thai faces self-hosted via
  `@fontsource`; the `:lang(en)` letter-spacing rule in `index.css` must keep Thai combining marks
  attached — do not regress it).

## 3. Provider architecture

Modeled verbatim on `SettingsProvider` (`src/context/SettingsProvider.tsx` +
`src/context/settingsContext.ts`).

**`src/context/i18nContext.ts`** — context + hook, **no JSX** (component-free module, ESLint-safe):

```ts
import { createContext, useContext } from 'react';
import { strings, type Language, type UIStrings } from '@/i18n/strings';

export interface I18nContextValue {
  lang: Language;                 // 'en' | 'th'
  setLang: (l: Language) => void; // update + persist
  toggle: () => void;             // en ⇄ th (navbar shortcut)
  t: UIStrings;                   // strings[lang] — the active string tree
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
```

**`src/context/I18nProvider.tsx`** — the component:

- `const [lang, setLangState] = useState<Language>(() => resolveInitialLanguage());` — lazy init reads
  storage → browser → default, exactly once.
- `setLang(l)` updates state **and** persists `opendys.lang.v1` immediately (no debounce — a discrete
  event). `toggle()` flips `lang`.
- `useEffect(() => { document.documentElement.lang = lang; }, [lang]);` — keeps the document language in
  sync (a11y + the `:lang(en)` rule).
- `const t = strings[lang];` derived; `value` memoized on `[lang]`.
- Renders `<I18nContext.Provider value={value}>{children}</I18nContext.Provider>`.
- Reuses the `safeLocalGet` / `safeLocalSet` try/catch wrappers (private-mode Safari guard), consistent
  with `SettingsProvider`.

**Provider insertion** (`src/main.tsx`):

```tsx
<StrictMode>
  <BrowserRouter>
    <I18nProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </I18nProvider>
  </BrowserRouter>
</StrictMode>
```

`I18nProvider` wraps `SettingsProvider` (order is immaterial today — neither depends on the other) so the
whole tree, including the settings drawer and the navbar, can read the active language.

## 4. Pure helpers — `src/utils/i18n/` (coverage-gated)

The 90/90/90/80 coverage gate is scoped to `src/utils/**`, so all pure logic lives here with co-located
`*.test.ts`:

- **`language.ts`**
  - `export const LANG_STORAGE_KEY = 'opendys.lang.v1';`
  - `detectBrowserLanguage(): Language` —
    `(navigator.language ?? '').toLowerCase().startsWith('th') ? 'th' : 'en'`.
  - `parseStoredLang(raw: string | null): Language | null` — JSON-parse the `{ lang, v }` envelope,
    validate `lang ∈ {'en','th'}` and `v === 1`, else `null`.
  - `serializeLang(lang: Language): string` — envelope writer (round-trips with `parseStoredLang`).
  - `resolveInitialLanguage(): Language` —
    `parseStoredLang(safeLocalGet(LANG_STORAGE_KEY)) ?? detectBrowserLanguage()` (the `'en'` default is
    folded into `detectBrowserLanguage`'s else branch).
- **`index.ts`** — barrel re-export.

React 19 StrictMode-safe: init is idempotent (a pure read of storage + `navigator`).

## 5. Type-safe dictionary schema

The hard type-safety constraint is satisfied in two layers.

**Layer 1 — Missing-key guarantee (already free).** `strings: Record<Language, UIStrings>` with a single
shared `UIStrings` interface means: add a key to `UIStrings` and `tsc` errors unless **both** `en` and
`th` objects provide it. No tooling required — this is the existing design, and `tsconfig.app.json` has
`strict: true`.

**Layer 2 — Enum ↔ dict drift hardening (new).** The error/progress sub-objects are dynamically indexed
by keys that also live in runtime enums. Binding them with `Record<…>` makes the dictionary fail to
compile if an enum gains a variant the dict doesn't cover. The key counts match exactly:

```ts
// in src/i18n/strings.ts — replace the hand-written sub-interfaces with Record types:
export interface OcrStrings {
  // …unchanged leaf fields…
  readonly progress: Record<OcrProgressMessageKey, string> & { readonly cancel: string };
  readonly errors: Record<OcrErrorKey, string>;
}
export interface AsrStrings {
  // …unchanged leaf fields…
  readonly errors: Record<AsrErrorKey, string>;
}
```

- `AsrErrorKey` (7) ↔ `AsrStrings.errors` (7) — `src/hooks/useAsr.ts:26`
- `OcrErrorKey` (8) ↔ `OcrStrings.errors` (8) — `src/hooks/useOcr.ts:19`
- `OcrProgressMessageKey` (4) ↔ `OcrStrings.progress` (4 message keys) + the non-message `cancel` field
  — `src/utils/ocr/progress.ts:3`

`UIStrings` also gains the new keys for the bypass strings and the toggle (see [wbs.md](./wbs.md) P2).

## 6. Component & module map

- **Provider / hook / helpers:** `src/context/i18nContext.ts`, `src/context/I18nProvider.tsx`,
  `src/utils/i18n/{language,index}.ts`.
- **16 consumer swap sites** (each `strings.en…` → `useTranslation().t…`): `layouts/RootLayout.tsx`,
  `pages/{HomePage,ReaderPage,OcrPage,AsrPlaygroundPage}.tsx`,
  `components/reader/Reader.tsx` (reads both `reader` + `asr`),
  `components/ocr/{OcrResult,OcrProgress,CapturePanel,EngineToggle,LanguageSelect,UploadDropzone}.tsx`,
  `components/settings/{SettingsButton,SettingsDrawer,TypographyPanel}.tsx`.
- **Toggle UI:** Settings drawer control (in / next to `TypographyPanel.tsx`) + navbar shortcut
  (`RootLayout.tsx`).
- **Dictionary:** `src/i18n/strings.ts` (extend `UIStrings`; retype error/progress; populate new keys in
  both `en` and `th`).
- **HTML metadata:** `document.documentElement.lang` via the provider. `index.html` keeps its static
  `<html lang="en">` as the pre-hydration default.

## 7. The 16-site swap pattern (minimal churn)

The existing call shape is preserved — only the source changes:

```ts
// before                                  // after
const t = strings.en;            →        const t = useTranslation().t;
const t = strings.en.reader;     →        const t = useTranslation().t.reader;
const t = strings.en.ocr;        →        const t = useTranslation().t.ocr;
const t = strings.en.asr;        →        const t = useTranslation().t.asr;
const t = strings.en.settings;   →        const t = useTranslation().t.settings;
```

`Reader.tsx` consumes two namespaces:

```ts
const { t } = useTranslation();
const tReader = t.reader;   // was: const t = strings.en.reader;
const tAsr = t.asr;         // was: const tAsr = strings.en.asr;
```

`SettingsButton.tsx` uses the value inline (`aria-label={strings.en.settings.open}`) →
`aria-label={useTranslation().t.settings.open}` (hoist to a `const` if the lint prefers it).

Inlined literals at these sites — plus the 3 hardcoded aria-labels (`Loading`, `practice mode`,
`Reading ruler`) — are replaced with the new dictionary keys (P2 / P3).

## 8. State model

Single source of truth: `lang` in `I18nProvider` state. `t = strings[lang]` is derived and memoized.
Consumers re-render on `lang` change via context. No global store, no URL coupling (a future RFC could
derive lang from the path, but that is out of scope). React 19 StrictMode double-invocation is safe
because init is a pure read.

## 9. Layout-integrity strategy

Thai labels are ~3× wider than English. Risk surfaces and mitigations:

- **Navbar** (`RootLayout.tsx`): already dense. Add **only** the compact shortcut (a small
  `btn-ghost btn-sm` / circle showing `EN` / `TH`); keep the drawer as the primary control. Verify at
  360 px.
- **Reader toolbar** (`Reader.tsx`): already `flex-wrap`; verify visual order doesn't rupture when Thai
  labels wrap.
- **No traps:** no `whitespace-nowrap` / `truncate` exist in the codebase today (confirmed), so no text
  is silently clipped — nothing to remove.
- **Dev pages** are localized last (P6) and never gate the production exit criteria.

## 10. Known gaps / blueprint delta

- **`<title>` & meta description** stay English on first paint (CSR-only; the provider can optionally
  update them, but it is low-impact and not required for the exit gate).
- **PWA manifest `lang: 'en'`** is build-static (`vite.config.ts`); optional follow-up, low impact.
- **Content-language option labels** (`ไทย (Thai)` in the OCR / ASR / reader language selects) are a
  per-key decision: keep bilingual for disambiguation, or go pure. Default: drop the parenthetical in
  the `en` tree (`'Thai'`) since the toggle now disambiguates; revisit per key during P2.
