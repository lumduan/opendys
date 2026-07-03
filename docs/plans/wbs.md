# Work Breakdown Structure (WBS)

Decomposes [ROADMAP](./ROADMAP.md) Phases 2–6 into concrete tasks. Status uses the
[standard legend](./README.md#status-legend). Phase 0–1 are tracked directly in the ROADMAP.

## 2. Core Linguistic & Parsing Engine — [§Phase 2](./ROADMAP.md#phase-2--core-linguistic--parsing-engine)

### 2.1 Thai engine — `src/utils/thai/`

- [x] `thaiChars.ts` — code-point ranges + `is*` predicates (consonant, leading/following vowel,
      upper/lower vowel, tone, karan, digit)
- [x] `classify.ts` — `classifyThaiChar(cp) → { category, level }`
- [x] `cluster.ts` — `Intl.Segmenter` grapheme clustering + leading-vowel re-merge into visual syllables
- [x] `karan.ts` — `markSilentConsonants` (การันต์, exact) + `estimateSyllableFinals` (heuristic)
- [x] `colorTokens.ts` — `toColorTokens(text)` → 4-level color render model

### 2.2 Latin / shared engine — `src/utils/latin/`

- [x] `textMetrics.ts` — `buildTextStyle(settings)` → `CSSProperties`
- [x] `tokenize.ts` — `splitWords`, `splitSentences`, `splitLines`

### 2.3 Quality

- [x] Vitest suites beside each module; ≥90% line coverage on `src/utils/**`
- [x] [ADR-0003](./adr/ADR-0003-thai-4level-parsing-strategy.md) — parsing strategy

## 3. Multi-Lingual Web Worker OCR — [§Phase 3](./ROADMAP.md#phase-3--multi-lingual-web-worker-ocr)

- [x] ~~`src/workers/ocr.worker.ts`~~ → `src/services/ocr/tesseractClient.ts` (main-thread
      `createWorker`; tesseract owns the worker — no nested worker, per ADR-0004) + `imagePrep.ts`
- [x] `vite-plugin-static-copy` → `/tesseract/` (`worker.min.js`, LSTM core variants); committed
      `public/tesseract/lang/{eng,tha}.traineddata.gz`; `scripts/fetch-ocr-models.mjs` (maintainer)
- [x] `src/utils/ocr/` pure helpers (paths, language, progress, text, image, support) + tests
- [x] `src/components/ocr/` — `UploadDropzone`, `CapturePanel`, `LanguageSelect`, `OcrProgress`, `OcrResult`
- [x] `src/hooks/useOcr.ts` — job lifecycle (`idle→preparing→recognizing→done|error`) + `useOcr.test.ts`
- [x] `src/pages/OcrPage.tsx` (lazy `/read` route); i18n `ocr` strings (en + th)
- [x] [ADR-0004](./adr/ADR-0004-ocr-model-packaging.md) — OCR model packaging & language-pack strategy

## 4. Universal Accessibility UI — [§Phase 4](./ROADMAP.md#phase-4--universal-accessibility-ui-components)

- [ ] `src/context/SettingsContext.tsx` + `useSettings` (localStorage-persisted)
- [ ] `src/components/settings/TypographyPanel.tsx` — sliders bound to `textMetrics`
- [ ] Fonts via `@fontsource/{opendyslexic,sarabun,mitr}` (self-hosted, OFL-1.1)
- [ ] `src/components/reader/ColorText.tsx` — renders `colorTokens`
- [ ] `src/components/reader/GuideLines.tsx` — toggleable 4-line overlay
- [ ] `src/components/reader/ReadingRuler.tsx` — mouse/touch/keyboard line focus
- [ ] `src/hooks/useSpeech.ts` — `speechSynthesis` EN/TH voice matching + tap-to-speak

## 5. Performance, PWA & A11y — [§Phase 5](./ROADMAP.md#phase-5--performance-pwa--accessibility-verification)

- [ ] `vite-plugin-pwa` config (precache shell; `CacheFirst` for `traineddata`+`wasm`; raised size cap)
- [ ] `navigator.storage.persist()`
- [ ] WCAG AA contrast audit of the 4 Thai colors on `cupcake` + `pastel`
- [ ] Keyboard focus order + ARIA labels; `prefers-reduced-motion`
- [ ] Bundle analysis; code-split the OCR worker

## 6. Hardening & Release — [§Phase 6](./ROADMAP.md#phase-6--hardening-open-source-documentation--release)

- [ ] Nginx header/cache tuning verified against the built image
- [ ] `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `RELEASING.md`
- [ ] Tag-driven `v1.0.0` → GHCR image
