# ADR-0001 — 100% Client-Side OCR Architecture

- **Status:** Accepted — refined by [ADR-0004](./ADR-0004-ocr-model-packaging.md) (language-pack
  format & packaging; the "fast" models are superseded by `4.0.0_best_int`); amended by
  [ADR-0005](./ADR-0005-optional-cloud-ocr-typhoon.md) (zero-egress holds **by default**, but an opt-in
  "Enhanced Thai OCR (Cloud)" engine may egress one image to Typhoon when the user explicitly enables it)
- **Date:** 2026-07-03

## Context

opendys processes images that frequently contain a child's schoolwork. The single most important
property of the product is **privacy**: those images and the recognized text must never leave the
device. The app must also work **offline** (homes and classrooms with poor connectivity) and be
**free** to run and self-host, with no per-request server cost.

A conventional design would POST the image to a server-side OCR API. That is incompatible with all
three goals: it egresses private data, requires a network, and incurs hosting cost.

We need OCR for both **English** and **Thai**, and Thai is a complex script requiring its own trained
model.

## Decision

**We will run all OCR entirely in the browser** using [`tesseract.js@7`](https://github.com/naptha/tesseract.js)
executed inside a dedicated **Web Worker** (off the main thread), with **all assets self-hosted**:

- `worker.min.js`, the full `tesseract.js-core` WASM dist (all SIMD/LSTM variants), and the
  `eng` + `tha` `.traineddata.gz` language packs are copied into `public/` and served same-origin.
  `createWorker` is configured with local `workerPath`, `corePath`, and `langPath` so **no CDN is
  ever contacted**.
- The app ships the **`tessdata_fast`** models (eng ≈ 3.9 MB, tha ≈ 1.0 MB) as the default; the
  larger `tessdata_best` may be offered later as an optional download for difficult Thai scans.
- Models and WASM are cached via the Service Worker (Phase 5) for fully offline reuse.

The static build is served by a hardened non-root nginx container; there is **no application
backend**.

## Consequences

**Positive**

- Absolute privacy: images and text have no code path to the network.
- Works offline after first load; zero server cost; trivially self-hostable.
- OCR runs off the main thread, keeping the UI responsive.

**Negative / trade-offs accepted**

- First visit downloads several MB of models + WASM (mitigated by caching + progress UI).
- In-browser OCR is slower and somewhat less accurate than cloud OCR, especially for Thai
  (mitigated by fast-model defaults with an optional best-model upgrade path).
- We self-host and version large binary assets in the repo/build.

## Alternatives Considered

- **Server-side / cloud OCR API** — rejected: egresses private data, needs network and hosting.
- **CDN-loaded Tesseract assets** (jsDelivr defaults) — rejected: runtime third-party egress and a
  hard dependency on network availability; breaks the offline guarantee.
- **WASM OCR on the main thread** — rejected: blocks the UI during recognition.
