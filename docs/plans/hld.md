# High-Level Design (HLD)

## 1. Purpose & Scope

opendys turns a photo of English or Thai text into a customizable, dyslexia-friendly reading
experience — entirely inside the user's browser. This document describes the architecture that
delivers that while guaranteeing privacy (no data ever leaves the device) and offline operation.

Cross-references: [FRD](./frd.md) · [WBS](./wbs.md) · [ADR-0001](./adr/ADR-0001-client-side-ocr-architecture.md)
· [ADR-0002](./adr/ADR-0002-multi-language-typography-font-system.md).

## 2. Architectural Constraints (non-negotiable)

1. **Client-side by default.** No telemetry; the build artifact is a static bundle served by any web
   server. Captured images and recognized text never leave the browser — with ONE opt-in exception: the
   "Enhanced Thai OCR (Cloud)" engine (off by default, [ADR-0005](./adr/ADR-0005-optional-cloud-ocr-typhoon.md)),
   where **nginx** (not the browser) proxies one image to Typhoon with a server-injected key. Even then
   the browser only ever calls its own origin (`connect-src 'self'`).
2. **Offline-first.** After the first visit, OCR models, fonts, and the app shell are cached so the
   app runs with no network (Phase 5 PWA).
3. **Dockerized & reproducible.** Multi-stage build → hardened non-root nginx; dev HMR via compose.
4. **English-first, i18n-ready.** No user-facing strings inlined in components — all route through
   `src/i18n/`.
5. **Logic in `utils/`, side effects in `hooks/`.** Components stay thin and declarative; the
   linguistic engine is pure and unit-testable.

## 3. System Data Flow

```
 ┌── capture / upload (browser only) ─────────────────────────────────────────┐
 │  <input type=file> / getUserMedia()                                        │
 └───────────────┬────────────────────────────────────────────────────────────┘
                 │ ImageBitmap / Blob (stays in memory)
                 ▼
        src/workers/ocr.worker.ts          ← Phase 3 (Web Worker, off main thread)
        tesseract.js@7  +  self-hosted     langPath / corePath / workerPath = local
        eng.traineddata.gz / tha.traineddata.gz
                 │ recognized text (string)
                 ▼
        src/utils/{thai,latin}/            ← Phase 2 (pure engine — built & tested first)
          classify → cluster → karan → colorTokens   (Thai)
          textMetrics · tokenize                      (Latin + shared)
                 │ render model: tokens {char, category, level, color}
                 ▼
        src/components/reader/*            ← Phase 4 (presentation)
          ColorText · GuideLines · ReadingRuler · Toolbar
                 │ user taps a word / sentence
                 ▼
        window.speechSynthesis            ← Phase 4 (offline TTS, OS voices)
          localService voice matched by lang (en-US / th-TH)
```

Nothing in this pipeline performs network I/O at runtime except the **one-time** fetch of model and
font assets (then served from the Cache API, Phase 5) and — only when the user opts into cloud OCR — a
same-origin `POST /api/typhoon-ocr` that nginx proxies to Typhoon server-side (ADR-0005).

## 4. Component & Module Map

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routing / shell | `src/App.tsx`, `src/layouts/` | Routes, page frame, theme. |
| Pages | `src/pages/` | Screen-level composition. |
| OCR | `src/components/ocr/`, `src/workers/` | Capture/upload UI + Tesseract worker (Phase 3). |
| Reader | `src/components/reader/` | Color text, guide lines, reading ruler (Phase 4). |
| Settings | `src/components/settings/`, `src/context/` | Typography controls + persisted state (Phase 4). |
| **Engine** | `src/utils/thai/`, `src/utils/latin/` | Pure classification/metrics logic (Phase 2). |
| i18n | `src/i18n/` | UI string dictionary. |

## 5. State Model

- **Reader settings** (font family, size, line/word/letter spacing, color-coding on/off, guide lines
  on/off, language) live in a React context, persisted to `localStorage` (Phase 4). Pure functions
  in `utils/latin/textMetrics.ts` translate settings → CSS.
- **OCR job state** (`idle | preparing | recognizing | done | error`) is local to the OCR feature.
- The **engine is stateless**: every `utils/` function is a pure transform of its inputs.

## 6. Privacy & Threat Model

- **Asset:** the user's captured image and recognized text (often a child's schoolwork).
- **Guarantee (default):** these never touch the network. Enforced by `connect-src 'self'`: the browser
  makes no fetch/XHR/WebSocket to any third party; only same-origin loads exist.
- **Opt-in exception (ADR-0005):** if the deployer sets `TYPHOON_API` and the user enables "Enhanced Thai
  OCR (Cloud)", that one image is POSTed same-origin to `/api/typhoon-ocr`, which **nginx** forwards to
  Typhoon with a server-side key. The key never reaches the browser (not `VITE_`-prefixed, injected by
  envsubst at runtime; `.env` is gitignored + dockerignored); the CSP is unchanged. Off by default.
- **Residual risks:** third-party CDN egress (mitigated — all models/fonts self-hosted, ADR-0001/2);
  Service Worker cache poisoning (mitigated — same-origin precache only). No cookies, no storage of
  images.

## 7. Known Gaps / Blueprint Delta

- **สะกด (live syllable-final) detection** is not fully decidable from Unicode; opendys ships a
  best-effort heuristic and marks only การันต์ (explicit silencer) with certainty. See
  [ADR-0003](./adr/ADR-0003-thai-4level-parsing-strategy.md).
- **Offline Thai TTS** depends on an OS-provided `th-TH` voice; when absent, TTS degrades gracefully
  (Phase 4). Voices cannot be bundled.
