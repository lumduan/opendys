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

- [ ] Typography customizer (font family, size, line/word/letter spacing) backed by `textMetrics`
- [ ] Self-hosted fonts via `@fontsource`: OpenDyslexic (Latin), Sarabun (looped Thai), Mitr (alt)
- [ ] Thai 4-level color rendering + toggleable 4-line overlay guides (FR-3)
- [ ] Universal Reading Ruler (mouse / touch / keyboard, dims unread lines)
- [ ] Offline Web Speech TTS with EN/TH voice switching + tap-to-speak (word / sentence)
- [ ] Settings persistence (localStorage) via a React context

**Exit criteria:** a user can OCR text, restyle it, color-code Thai, run the ruler, and hear it read.

---

## Phase 5 — Performance, PWA & Accessibility Verification

> Goal: Installable, offline-first, and verified against WCAG AA.

- [ ] `vite-plugin-pwa` (`generateSW`): precache app shell; `CacheFirst` runtime caching for
      `traineddata` + `wasm`; raise `maximumFileSizeToCacheInBytes` above the model sizes
- [ ] `navigator.storage.persist()` so models are not evicted
- [ ] WCAG AA contrast audit of the 4 Thai colors on both pastel themes
- [ ] Keyboard focus order + screen-reader labels across all interactive components
- [ ] Bundle analysis; lazy-load OCR/worker code

**Exit criteria:** Lighthouse PWA + a11y pass; app works fully offline after first visit.

---

## Phase 6 — Hardening, Open-Source Documentation & Release

> Goal: A polished, documented, distributable v1.0.0.

- [ ] Nginx security & caching header tuning; verified production Docker image
- [ ] `README.md` (usage, self-hosting, privacy stance), `LICENSE` (MIT), `CONTRIBUTING`, `CHANGELOG`
- [ ] `RELEASING.md`; tag-driven `v1.0.0` → GHCR image
- [ ] Community docs: how to add a language, how to self-host an instance

**Exit criteria:** `v1.0.0` tag builds and publishes; a newcomer can self-host from the README alone.

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

- **Active phase:** Phase 4 — Universal Accessibility UI Components
- **Completed:** Phase 0 (bootstrap), Phase 1 (docs), Phase 2 (engine + tests), Phase 3 (offline OCR)
- **In progress:** —
- **Notes:** Published at `github.com/lumduan/opendys` (CI green). Camera capture & true airplane-mode
  are device-verified manually; offline Thai TTS depends on OS-provided voices (verified at runtime
  in Phase 4).
