# FRD — Internationalization / Language Switcher (ระบบเปลี่ยนภาษา)

Functional Requirements for the i18n (internationalization) layer. Status uses the
[standard legend](../README.md#status-legend). Cross-references: [hld.md](./hld.md), [wbs.md](./wbs.md),
the top-level [hld.md](../hld.md) ("English-first, i18n-ready" principle), and
[CONTRIBUTING.md](../../../CONTRIBUTING.md) ("no user-facing strings inlined in components").

This phase fulfills the long-deferred promise in `src/i18n/strings.ts:1` — _"A full i18n context/provider
lands in Phase 4 (see ROADMAP)"_ — which shipped the bilingual dictionary but never the provider that
reads it.

## 1. Product summary

opendys is currently **English-first**: every component reads `strings.en.*` directly, the entire
`strings.th` tree is dead code, and the UI is peppered with **hybrid** strings that bolt parenthetical
Thai onto English for disambiguation — e.g. `"Practice reading (ฝึกอ่านออกเสียง)"`, `"ไทย (Thai)"`. For a
dyslexic reader this parenthetical clutter is pure cognitive tax.

This phase delivers a complete **i18n layer**: a React context + provider that serves the active
language's string tree, an explicit **EN ⇄ TH toggle** (primary control in the Settings drawer, plus a
compact navbar shortcut), **browser-language auto-detection** on first visit, and **persistence**. The
bilingual dictionary already exists and is fully translated — the work is wiring it live and eliminating
the bypass/hybrid strings.

Outcome: with one tap, the _entire_ interface — navbar, home, reader, OCR, ASR practice, settings,
errors — re-skins into the chosen language, with zero hybrid leftovers on production-critical pages.

## 2. Personas

- **Nong (child learner, Thai-first).** The primary audience. Today she lands on an English interface
  cluttered with Thai in parentheses; she wants a clean, fully-Thai UI the moment she opens the app.
- **Khru (teacher).** Switches between languages to demonstrate English and Thai reading; needs the
  toggle to be one tap and to persist between lessons.
- **English-first reader.** Wants the UI in English without Thai disambiguation noise.
- **Self-hoster.** Cares that the app stays 100% offline and private — the dictionary must be
  bundle-internal, with no new network egress and no third-party i18n dependency.

## 3. User stories

- As a reader, I toggle the entire UI between English and Thai in one tap, and it persists across
  reloads and reinstalls of the PWA.
- As a first-time Thai visitor, the app opens in Thai without me doing anything.
- As a reader, I never see mixed-language or parenthetical clutter on the reader, OCR result, or error
  messages.
- As a teacher switching mid-lesson, changing the UI language never interrupts an in-flight OCR job,
  ASR practice session, or read-aloud.
- As a screen-reader user, the document language (`<html lang>`) always matches what is shown, so
  pronunciation and the font `:lang()` rules stay correct.

## 4. Functional requirements

| ID | Requirement | Status |
| --- | --- | --- |
| FR-I18N-01 | Exactly two locales are supported: `en` (English) and `th` (Thai). The active language drives **every** user-facing string; no string is rendered from a hardcoded literal in production code. | `[ ]` |
| FR-I18N-02 | **Toggle — Settings drawer (primary).** A Language control is added to the Settings drawer (a labeled `select` or two-button `join`: `English` / `ภาษาไทย`). Selecting a language calls the provider and persists immediately. | `[ ]` |
| FR-I18N-03 | **Toggle — Navbar (shortcut).** A compact indicator in the top navbar shows the active language code (`EN` / `TH`) and toggles EN ⇄ TH on tap. It is sized to avoid overflow on a 360 px viewport given the existing dense navbar (Reader + OCR links + gear + offline badge). | `[ ]` |
| FR-I18N-04 | **Persistence.** The choice is stored in `localStorage` under key `opendys.lang.v1` (envelope `{ lang, v: 1 }`). The persisted value **always wins** on return visits, overriding browser detection. | `[ ]` |
| FR-I18N-05 | **First-visit detection.** With no stored key, the app reads `navigator.language`: any `th-*` prefix → Thai, otherwise → English. If `navigator.language` is unavailable/empty, it falls back to English. | `[ ]` |
| FR-I18N-06 | **`<html lang>` sync.** `document.documentElement.lang` is updated to the active language on every change (and on init), keeping screen-reader pronunciation and the `:lang(en)` letter-spacing rule correct. | `[ ]` |
| FR-I18N-07 | **Mid-session switching is safe.** Switching UI language only changes chrome; it does **not** disturb in-flight OCR / ASR / TTS. UI language is distinct from the content/TTS voice language (the existing `ttsLang` setting is untouched). | `[ ]` |
| FR-I18N-08 | **No hybrid strings (exit gate).** 100% of production-critical surfaces — `/reader`, the OCR result container, error/alert states, settings, home, navbar — render in the selected language only. Parenthetical disambiguation such as `"Practice reading (ฝึกอ่านออกเสียง)"` is eliminated. | `[ ]` |
| FR-I18N-09 | **Compile-time completeness.** A missing English ↔ Thai counterpart is a `tsc` error (the dictionary is `Record<Language, UIStrings>` with a shared interface). The exit gate proves this by temporarily removing a key and observing a failed `typecheck`. | `[ ]` |
| FR-I18N-10 | **Offline / no-regression.** The dictionary is bundle-internal; the app stays 100% offline-capable, adds **zero** network egress, and the service-worker precache is untouched (the dict rides inside the existing JS chunk). | `[ ]` |

## 5. Locale, detection & persistence contract

Resolution order (highest priority first), evaluated once at provider init:

1. **Stored** — `opendys.lang.v1` → `{ lang }`, validated to `'en' | 'th'` with `v === 1`; invalid/absent
   ⇒ continue.
2. **Browser** — `navigator.language` lower-cased; `startsWith('th')` ⇒ `'th'`, else continue.
3. **Default** — `'en'` (folded into the browser step's else branch).

`setLang(l)` writes both React state and `opendys.lang.v1` immediately — no debounce, because a language
change is discrete and rare (unlike slider drags). The provider never re-runs detection once a value is
stored; clearing storage restores first-visit detection.

The storage key follows the established convention `opendys.<domain>.v<N>` (see `SettingsProvider`
`opendys.reader.v1`, `asrHistory` `opendys.asr.v1`) and reuses the same `safeLocalGet` / `safeLocalSet`
try/catch wrappers (private-mode Safari guard).

## 6. Non-functional requirements

- **Type safety.** TypeScript `strict`, no `any`; missing-key detection is a compile error, not a runtime
  surprise. The dynamic-indexed error/progress sub-objects are additionally bound to their runtime enums
  via `Record<…Key, string>` so the dictionary cannot drift from what the hooks emit
  (see [hld.md](./hld.md) §5).
- **Layout integrity.** Thai labels are roughly 3× the width of their English counterparts; the toggle
  and every re-skinned control must not overflow or wrap-rupture on a 360 px viewport. The reader toolbar
  already uses `flex-wrap`; the navbar gains only a compact shortcut (the drawer remains the primary
  control). No `whitespace-nowrap` / `truncate` exists today, so nothing traps text.
- **Accessibility.** `<html lang>` stays in sync; all `aria-label` / `title` equivalents are localized;
  the toggle is keyboard-reachable and announced.
- **Offline / no-regression.** PWA app shell unaffected; no new dependencies; CSP `connect-src 'self'`
  zero-egress preserved.
- **Standards.** React 19 + TS strict; all pure logic in `src/utils/i18n/**` under the 90/90/90/80
  coverage gate; `npm run lint`, `typecheck`, `test:run`, `build` all stay green.
