# ADR-0004 — OCR Engine: Worker Model, Core Selection & Language-Pack Packaging

- **Status:** Accepted
- **Date:** 2026-07-03

## Context

Phase 3 implements offline OCR with `tesseract.js@7`. ADR-0001 set the 100%-client-side, zero-egress
constraint and named "fast" models; this ADR records the concrete packaging decisions that make it
real, and refines a couple of ADR-0001's specifics based on what `tesseract.js@7` actually ships.

Findings that drove the decisions:

- `createWorker` runs on the **main thread** but spawns tesseract's **own dedicated Web Worker**, so
  OCR is already off the main thread. Wrapping it in a second app-authored worker would force a
  **nested worker**, which is unreliable on older Safari.
- `tesseract.js-core@7` is **single-threaded only** (no pthreads build) → **no `SharedArrayBuffer`**,
  so **no COOP/COEP / cross-origin isolation** is required.
- The core ships **6 engine tiers** (plain / simd / relaxedsimd, each × full/lstm). With the default
  `OEM.LSTM_ONLY`, only the **3 LSTM tiers** are ever loaded; the loader picks by CPU features at
  runtime, so all three must be shipped.
- Language models are **not** in any npm package and must be vendored.
- tesseract.js checks **gzip magic bytes** before gunzipping (`worker-script/index.js`), so it works
  whether or not the server sets `Content-Encoding: gzip` — a useful robustness property.

## Decision

1. **Main-thread `createWorker`, no app-level worker.** This **supersedes the `src/workers/ocr.worker.ts`
   item in `wbs.md`** (§3). The OCR lifecycle lives in `src/services/ocr/tesseractClient.ts` (loaded
   via a dynamic `import('tesseract.js')` for code-splitting) and `src/hooks/useOcr.ts`. FR-02's
   "off the main thread" is satisfied by tesseract's built-in worker (`worker.min.js`).
2. **Pin `OEM.LSTM_ONLY`** and ship **only the 3 LSTM core tiers** (`tesseract-core[-simd|-relaxedsimd]-lstm.{wasm,wasm.js}`,
   ~20 MB) instead of all 6 (~44 MB) — halving the offline precache. Copied from `node_modules` at
   build time by `vite-plugin-static-copy@^3` into `/tesseract/core/`. Switching OEM later would
   require also shipping the legacy cores.
3. **Language format = `4.0.0_best_int` (LSTM integer), committed.** This **refines ADR-0001's "fast"**:
   the `@tesseract.js-data/{eng,tha}@1.0.0/4.0.0_best_int` models are LSTM-only integer-quantized,
   `OEM.LSTM_ONLY`-compatible, already gzipped, and compact — `eng` is actually *smaller* than the
   `tessdata_fast` build, while improving the weak Thai accuracy ADR-0001 flagged. The two `.gz`
   files are **committed** to `public/tesseract/lang/` (~3.76 MB total).
   - **SHA-256** (verify with `node scripts/fetch-ocr-models.mjs --check`):
     - `eng.traineddata.gz` — `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` (2,952,873 B)
     - `tha.traineddata.gz` — `4550a5505184d1b79cf10416d5b19e643001d95411d5e717954dd26feef3ae74` (896,631 B)
4. **Commit models; the fetch script is maintainer-only, never `postinstall`.** Committing keeps
   `docker build` hermetic (the build stage needs no network) and guarantees the offline promise even
   against the build. `postinstall` was rejected: the Dockerfile runs `npm ci` **before** `COPY . .`,
   so a `postinstall` calling `scripts/fetch-ocr-models.mjs` would fail (script absent), and it would
   add a network dependency to every `npm install`.
5. **Serve `.gz` without `Content-Encoding: gzip`.** Our nginx keeps `gzip_static` **off** and `.gz`
   out of `gzip_types`, so models are served as opaque bytes. tesseract's magic-byte check makes this
   robust either way, but **do not enable `gzip_static`** (double-encoding would break the JS gunzip).
6. **Keep tesseract's default IndexedDB cache** (`cacheMethod:'write'`, `cachePath:'tesseract'`). It
   is what makes airplane-mode recognition work before the Phase 5 Service Worker exists. Footgun:
   the cache key is language-based, not content-hashed — bump a cache suffix if a model changes under
   the same filename. Phase 5 may switch to `cacheMethod:'none'` once the SW owns `CacheFirst`.

## Consequences

**Positive**

- Fully offline, zero-egress OCR; hermetic, reproducible Docker builds; no COOP/COEP complexity.
- Half the core payload vs. shipping all tiers; better Thai accuracy than `tessdata_fast`.
- OCR bundle is code-split out of the initial app load.

**Negative / trade-offs accepted**

- ~3.76 MB of binary models committed to the repo (accepted for a clone-and-self-host privacy tool).
- Shipping only LSTM cores couples us to `OEM.LSTM_ONLY`; changing OEM needs a copy-target change.
- First OCR on a fresh device downloads ~20 MB of core WASM + the model (then IDB-cached).

## Alternatives Considered

- **`tessdata_fast` + local gzip** — viable, but `best_int` is smaller (eng) and more accurate for
  Thai with no gzip step; rejected as strictly worse here.
- **Build-time / `postinstall` model download** — rejected: breaks hermetic Docker builds and the
  Dockerfile layer order (see Decision 4).
- **Ship all 6 core tiers** — rejected: doubles the offline payload for legacy cores we never use.
- **App-authored `ocr.worker.ts` wrapping tesseract** — rejected: nested workers break older Safari.
