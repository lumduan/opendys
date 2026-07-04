# opendys Roadmap

**opendys** is a 100% free, open-source, 100% client-side web app that helps people with dyslexia
read English and Thai. It captures or uploads an image of text, runs OCR fully offline, and presents
the result in a deeply customizable, dyslexia-friendly reader with color-coded Thai orthography, a
reading ruler, and offline text-to-speech. No backend, no telemetry, no egress of private data.

This roadmap is dependency-ordered. Each phase lists its goal, tasks (with status), and exit criteria.

## Status Legend

| Mark | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[-]` | Skipped / deferred |

---

## Phase 0 — Project Bootstrap

> Goal: A reproducible, containerized React 19 + TypeScript + Vite scaffold that passes every quality
> gate from commit one.

### 0.1 Scaffold & tooling

- [x] Vite + React 19 + TypeScript project (project-references tsconfig, `@/` path alias)
- [x] Tailwind CSS v3 + DaisyUI v4 (accessible pastel themes `cupcake` + `pastel`)
- [x] Vitest + jsdom + Testing Library, coverage scoped to `src/utils/**`
- [x] ESLint (legacy `.eslintrc.cjs`) with react-hooks + react-refresh
- [x] npm scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:run`, `test:coverage`

### 0.2 Containerization & CI

- [x] Multi-stage `Dockerfile` (Vite build → hardened non-root nginx on :8080)
- [x] `docker-compose.yml` (dev HMR on :5173 + `prod` profile)
- [x] GitHub Actions `ci.yml` (lint → typecheck → test → build → upload dist)
- [x] `release.yml` (tag-driven GHCR publish), `dependabot.yml`, issue templates

**Exit criteria:** `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` all pass;
`docker compose up` serves HMR; `docker compose --profile prod up --build` serves the built app.

---

## Phase 1 — Engineering Docs & Conventions

> Goal: The planning system is the source of truth before feature code grows.

- [x] `docs/plans/README.md` — conventions, status legend, workflow, templates
- [x] `ROADMAP.md` — this document
- [x] `hld.md`, `frd.md`, `wbs.md`
- [x] `ADR-0000-template.md`, `RFC-0000-template.md`
- [x] `ADR-0001` — 100% Client-Side OCR Architecture
- [x] `ADR-0002` — Multi-Language Typography & Font System

**Exit criteria:** all blueprint docs present and cross-linked; ROADMAP reflects real status.

---

## Phase 2 — Core Linguistic & Parsing Engine

> Goal: Pure, unit-tested utilities that isolate Thai 4-level orthography and drive Latin text
> customization — the app's differentiator, built and tested before any UI depends on it.

### 2.1 Thai orthography engine (`src/utils/thai/`)

- [x] `thaiChars.ts` — code-point constants + predicates for every category
- [x] `classify.ts` — `classifyThaiChar` → `{ category, level }`
- [x] `cluster.ts` — grapheme clustering + leading-vowel → consonant re-merge
- [x] `karan.ts` — silent (การันต์) detection + best-effort สะกด heuristic
- [x] `colorTokens.ts` — 4-level color render model (FR-3)

### 2.2 Latin text engine (`src/utils/latin/`)

- [x] `textMetrics.ts` — CSS builder for font size / line / word / letter spacing
- [x] `tokenize.ts` — word & sentence splitting for TTS and the reading ruler

### 2.3 Tests & decision record

- [x] Vitest suites for every util (≥90% line coverage)
- [x] `ADR-0003` — Thai 4-Level Parsing Strategy

**Exit criteria:** all four gates green; coverage thresholds met; ADR-0003 written.

---

## Phase 3 — Multi-Lingual Web Worker OCR

> Goal: Fully offline image → text using Tesseract.js in a Web Worker with self-hosted models.

- [x] `tesseract.js@7` via main-thread `createWorker` (its own dedicated worker; no nested worker — ADR-0004)
- [x] Self-host `worker.min.js`, the LSTM `tesseract.js-core` variants, and committed `eng`+`tha`
      `.traineddata.gz` under `/tesseract/**` (zero CDN egress)
- [x] Capture (camera) + upload UI with progress, cancel, and preparing/error states
- [x] Language toggle (English / Thai / Auto `eng+tha`); preflight model check → clear "missing" error
- [x] `ADR-0004` — OCR model packaging & language-pack strategy

**Exit criteria:** an uploaded EN or TH image decodes to text offline (airplane mode) after first load.

---

## Phase 4 — Universal Accessibility UI Components

> Goal: The dyslexia-friendly reading surface and controls, for both scripts.

- [x] Typography customizer (font family, size, line/word/letter spacing) via a settings drawer
- [x] Self-hosted fonts via `@fontsource`: OpenDyslexic (Latin), Sarabun (looped Thai), Mitr (alt)
- [x] Thai 4-level color rendering + toggleable guide lines (repeating-gradient background, FR-3)
- [x] Universal Reading Ruler (pointer / touch / keyboard, dims unread text, scoped box-shadow)
- [x] Offline Web Speech TTS (localService-only voices, tap-to-speak + read-aloud, graceful degrade)
- [x] Settings persistence (localStorage) via a React context (instant state, debounced write)

**Exit criteria:** a user can OCR text, restyle it, color-code Thai, run the ruler, and hear it read.
_(letter-spacing scoped to Latin only — Thai combining marks stay attached; verified in-browser.)_

---

## Phase 5 — Performance, PWA & Accessibility Verification

> Goal: Installable, offline-first, and verified against WCAG AA.

- [x] `vite-plugin-pwa` (`generateSW`): precache app shell + fonts (woff2 only); `CacheFirst` runtime
      caching for the ~24 MB `/tesseract/` models+wasm (precache limit untouched — runtime-only)
- [x] `navigator.storage.persist()` so the SW cache + tesseract IndexedDB models aren't evicted
- [x] WCAG audit of the 4 Thai colors (large-text 3:1 passes on cupcake+pastel; codified as a test)
      + a colorblind-safe (Okabe-Ito) palette option + a silent-role underline cue (WCAG 1.4.1)
- [x] A11y sweep — axe-core 0 serious/critical on `/reader` + `/read` (fixed accent-as-text contrast)
- [x] Bundle: lazy-load ReaderPage/OcrPage/dev (OCR worker already code-split); PWA icons

**Exit criteria:** Lighthouse PWA + a11y pass; app works fully offline after first visit.
_(SW + precache verified offline-capable; real airplane-mode OCR needs one online recognition first —
models are runtime-cached, not precached. App shell/reader/fonts/TTS work offline immediately.)_

---

## Phase 6 — Hardening, Open-Source Documentation & Release

> Goal: A polished, documented, distributable v1.0.0.

- [x] Nginx hardening: strict CSP (`connect-src 'self'` = enforced zero-egress), Permissions-Policy,
      XFO DENY, COOP/CORP — applied on every path (fixed the `add_header` inheritance bug)
- [x] `README.md` (+ screenshot), `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`
- [x] `RELEASING.md`; tag-driven **`v1.0.0` → GHCR** (`ghcr.io/lumduan/opendys`, public, verified pullable)
- [x] Community docs: how to add a language + self-host (README + CONTRIBUTING)

**Exit criteria:** `v1.0.0` tag builds and publishes; a newcomer can self-host from the README alone.
_✅ Met: `docker run -p 8080:8080 ghcr.io/lumduan/opendys:v1.0.0` runs the released image; OCR verified
working under the hardened CSP with zero external requests._

---

## Phase 7 — Post-1.0: Thai fidelity, OCR quality & optional cloud OCR

> Goal: Fix real-world Thai issues found in production testing, and add an opt-in accuracy escalation
> for the hardest documents — without giving up the private, offline default.

- [x] **v1.0.1** — Thai tone-mark render fix: color **per grapheme cluster** so combining marks stay
      attached to their base (no more dotted circles); NFC-normalize OCR output. (ADR-0003 render model.)
- [x] **v1.1.0** — on-device Thai OCR tuning: **upscale small images** (the prep was downscale-only) +
      AUTO page segmentation (PSM 3) + `preserve_interword_spaces`/`user_defined_dpi`. Verify-first
      finding: float `tessdata_best` models crash the tesseract.js WASM core → keep `4.0.0_best_int`.
- [x] **v1.2.0** — optional **opt-in Typhoon cloud OCR** for hard Thai: same-origin `/api/typhoon-ocr`
      nginx proxy injecting a **server-side** `TYPHOON_API` key (off by default; key never in the bundle;
      `connect-src 'self'` unchanged; no key ⇒ graceful 503 / 100% on-device). "Enhanced Thai OCR (Cloud)"
      toggle + `/api/ocr-capabilities` probe + explicit notice; `system`-font Thai stacking hardening;
      docs reconciled ([ADR-0005](./adr/ADR-0005-optional-cloud-ocr-typhoon.md)).
- [x] **v1.3.0** — reader UX: **granular per-category Thai coloring** (upper vowel / lower vowel / tone /
      silent each a distinct color, applied per grapheme cluster → layout-safe on Safari/iOS + Chrome) +
      **karaoke** word highlight during Read-Aloud (Web Speech `onboundary` → CSS Custom Highlight API,
      with a graceful sentence-highlight fallback on iOS Safari).
      [ADR-0006](./adr/ADR-0006-granular-thai-coloring-and-karaoke-tts.md).

**Exit criteria:** Thai renders correctly on stacked marks; on-device OCR improved on document photos;
cloud OCR opt-in verified end-to-end (proxy forwards with the server-side key → Typhoon; no key ⇒ 503,
site stays fully static/private).

---

## Dependency Map

```
Phase 0  (bootstrap)
   └── Phase 1  (docs)
          └── Phase 2  (linguistic engine)  ──┐
                                              ├── Phase 4  (a11y UI)
          Phase 3  (OCR worker)  ────────────┘
                                              └── Phase 5  (PWA + a11y verify)
                                                     └── Phase 6  (hardening + release)
```

Phase 3 (OCR) depends only on Phase 0 and can proceed in parallel with Phase 2; Phase 4 needs both.

## Estimated Timeline

| Phase | Scope | Relative effort |
| --- | --- | --- |
| 0 | Bootstrap | S |
| 1 | Docs | S |
| 2 | Linguistic engine | M |
| 3 | OCR worker | L |
| 4 | Accessibility UI | L |
| 5 | PWA + a11y verify | M |
| 6 | Hardening + release | M |

## Current Status

- **Active phase:** Phase 7 (post-1.0 OCR quality & optional cloud) — shipping incrementally.
- **Completed:** Phases 0–6 (**v1.0.0**) + Phase 7 to date — **v1.0.1** (Thai render fix), **v1.1.0**
  (on-device OCR tuning), **v1.2.0** (opt-in Typhoon cloud OCR).
- **Released:** `v1.0.0` → `v1.2.0` on `ghcr.io/lumduan/opendys` (`:latest` = newest, public); GitHub
  Releases published; CI + Release workflows green.
- **Manual/device checks remaining:** Lighthouse PWA+a11y, real EN/TH TTS audio on-device, camera
  capture, true airplane-mode OCR (needs one online recognition first — models are runtime-cached); a
  live Typhoon **200** with a real key (dummy-key wiring verified in CI/local).
- **Future ideas** live in Phase 8 / RFCs (e.g. more languages, model-precache toggle, dark theme with
  theme-aware Thai colors).
