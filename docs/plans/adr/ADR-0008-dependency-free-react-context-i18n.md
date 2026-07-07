# ADR-0008 — Dependency-Free React Context i18n (Language Switcher)

- **Status:** Accepted — fulfills the deferred "Phase 4 i18n provider" promise in `src/i18n/strings.ts:1`
  and the "English-first, i18n-ready" principle in [`docs/plans/hld.md`](../hld.md). Typography/font
  readiness references [ADR-0002](./ADR-0002-multi-language-typography-font-system.md); the storage +
  context pattern references the `SettingsProvider` established in Phase 4.
- **Date:** 2026-07-07

## Context

opendys serves English **and** Thai dyslexic readers, but ships **English-first**: every component pins
`const t = strings.en.*`, the entire `strings.th` tree is dead code, and the UI is littered with **hybrid**
parenthetical strings (`"Practice reading (ฝึกอ่านออกเสียง)"`, `"ไทย (Thai)"`) that add cognitive load for
exactly the readers the app serves. A complete bilingual dictionary already exists
(`src/i18n/strings.ts` — `en` and `th` both fully populated), so the translation work is already done;
what is missing is the runtime layer that selects the active language.

The design is bounded by hard constraints:

- **100% offline.** No new network egress; the PWA service-worker precache must stay intact (a deployment
  with no API key is byte-for-byte the private, offline default).
- **Compile-time completeness.** A missing `en`↔`th` counterpart must be a `tsc` error, not a silent
  runtime fallback to a key name or English.
- **No bundle-weight regression / no new dependencies** beyond the existing React + Vite stack.
- **Thai is LTR** — no bidirectional-text work; fonts are already i18n-ready (ADR-0002: Sarabun/Mitr Thai
  faces self-hosted via `@fontsource`, and the `:lang(en)` letter-spacing rule keeps Thai combining marks
  attached).

## Decision

**Activate the existing typed dictionary through a dependency-free React context provider — not an i18n
library.**

- **Mirror `SettingsProvider`.** A split-file context (the context + `useTranslation()` hook in a
  component-free module `src/context/i18nContext.ts`; the provider component in `src/context/I18nProvider.tsx`)
  — required by the ESLint `react-refresh/only-export-components` rule. `useTranslation()` returns
  `{ lang, setLang, toggle, t }`, where `t: UIStrings` is `strings[lang]`.
- **Resolution order on first paint:** stored `localStorage` (`opendys.lang.v1`, envelope `{ lang, v: 1 }`)
  → `navigator.language` (`th-*` ⇒ Thai) → `'en'`. The persisted choice always wins on return visits;
  storage uses the existing `opendys.<domain>.v<N>` convention and `safeLocalGet/Set` wrappers.
- **`<html lang>` sync.** The provider updates `document.documentElement.lang` on every change (a11y
  pronunciation + the `:lang(en)` font rule).
- **Toggle in two places.** A primary control in the Settings drawer plus a compact navbar shortcut — the
  drawer is the safe home given the already-dense mobile navbar.
- **Compile-time completeness for free.** `strings: Record<Language, UIStrings>` with one shared
  `UIStrings` interface means adding a key is a `tsc` error unless **both** locales define it — no scanner,
  no codegen. The dynamically-indexed `errors`/`progress` sub-objects are additionally typed
  `Record<…Key, string>` (`AsrErrorKey`, `OcrErrorKey`, `OcrProgressMessageKey`) so the dictionary cannot
  drift from the keys the hooks emit.
- **Bundle-internal dictionary.** The dict rides inside the JS chunk that `vite-plugin-pwa` already
  precaches; offline capability and `connect-src 'self'` are unchanged.

## Consequences

**Positive**

- Zero new dependencies, zero new egress; the offline/private default and PWA precache are untouched.
- Completeness and enum↔dict drift are compile errors for free, from existing strict TS + the typed
  dictionary — no extra tooling.
- All Thai translations already exist, so implementation is **wiring** (provider + a mechanical ~16-site
  swap + a toggle), not translation work.
- Reuses the proven `SettingsProvider` pattern, so the surface area is small and familiar.

**Negative / trade-offs accepted**

- A single shared `UIStrings` (not per-locale files) means the bundle always carries both languages. Fine
  for two locales; would warrant per-locale code-splitting if many were added.
- `<title>` and meta description stay English on first paint (CSR-only, low impact); the PWA manifest
  `lang` is build-static. Both are optional follow-ups, not exit gates.
- No ICU/pluralization message format — adequate for the current flat string set, but a helper would be
  needed if complex plurals or grammar arise later.

## Alternatives Considered

- **`react-i18next` / `i18next`** — rejected: adds bundle weight, a runtime, and (with its completeness
  scanner) build tooling to provide guarantees the typed dictionary already gives for free; overkill for
  two locales.
- **`react-intl` / FormatJS** — rejected: ICU message syntax is heavier than the flat typed objects, with
  the same bundle/tooling cost and no incremental benefit.
- **Lingui** — rejected: its compile-step extraction model adds build complexity for no advantage over the
  existing typed dictionary.
- **Per-locale code-split chunks** — deferred: two locales are tiny and the monolithic `strings.ts`
  precaches cleanly. Revisit if the locale set grows.
- **URL-derived language (e.g. `/th/reader`)** — deferred to a future RFC; out of scope for the toggle,
  which persists a user preference instead.
