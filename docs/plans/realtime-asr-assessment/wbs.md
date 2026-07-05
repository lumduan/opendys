# WBS — Real-time ASR Reading Assessment

Decomposes the feature into phases. Status uses the [standard legend](../README.md#status-legend).
Maps to **Phase 8** in the [ROADMAP](../ROADMAP.md#phase-8--real-time-asr-reading-assessment). See
[frd.md](./frd.md) / [hld.md](./hld.md) / ADR-0007.

## P1 — PoC (Planning + sandbox) — this pass

- [x] Infra: `Dockerfile` `microphone=(self)`, `/api/typhoon-asr` proxy, `/api/ocr-capabilities` `asr`
      field; `vite.config.ts` dev proxy + capability mirror
- [x] `src/services/asr/typhoonAsrClient.ts` — multipart POST → `/api/typhoon-asr`, `TyphoonAsrError`
- [x] `src/utils/asr/response.ts` (`parseAsrText`) + `audio.ts` (mime/filename helpers)
- [x] `src/hooks/useAsr.ts` — mic capture + micro-batch stop→POST→restart window loop
- [x] `src/hooks/useAsrHighlight.ts` + shared `buildTextRange`/`highlightSupported` export from
      `useWordHighlight.ts`; `::highlight(asr-*)` CSS
- [x] `src/pages/AsrPlaygroundPage.tsx` (`/dev/asr-playground`), route in `App.tsx`, hidden link in
      `HomePage.tsx`; `asr` i18n (en+th)
- [x] Planning docs (`frd.md`, `hld.md`, `wbs.md`), `PoC/README.md`, ADR-0007, ROADMAP Phase 8
- [ ] **Live verify:** codec acceptance + window decodability end-to-end against Typhoon (record in
      `PoC/README.md`; finalize `audio.ts` fallback + ADR-0007)

## P2 — Core parser (alignment engine) — this pass

- [x] `src/utils/asr/` — `types`, `normalize` (NFC + case-fold + tone-strip + edge-punct leniency),
      `tokenizeTarget` (offset-aware EN-word / TH-syllable), `distance` (Levenshtein/similarity),
      `match` (fuzzy threshold), `align` (Needleman–Wunsch), `frontier` (monotonic), `session`
      (`evaluate`/`joinWindows`), `highlightRanges`, `storage`, barrel `index.ts`
- [x] Colocated `*.test.ts` for every module — **100% coverage on `src/utils/asr/**`** (clears 90/80)

## P3 — UI layouts (production integration)

- [x] Production **Practice Reading** control in the shared `<Reader>` (ships to `/reader` + OCR results
      at once), gated by `asr.supported && asr.typhoonAsrAvailable`, mutually exclusive with Read-Aloud
      TTS, with a consent notice shown during an active session + a compact accuracy/missed-words readout;
      sessions persisted via `src/services/asr/asrHistory.ts` (shared with the dev page)
- [x] Full permission / error / recording-state UX (reduced-motion is CSS-only, unaffected)
- [ ] Wire the ASR i18n through the Phase-4 i18n context (still English-only via `strings.en.asr`)

## P4 — Analytics (offline dashboard) — future

- [ ] `AsrHistoryProvider` (mirror `SettingsProvider`) reading `opendys.asr.v1`
- [ ] Offline stats view: accuracy over time, most-missed words, per-session detail
- [ ] Optional export / clear-history controls

## P5 — Hardening — future

- [ ] Rate-limit pacing safety net; window-size tuning; loop-vs-cumulative decision from P1 findings
- [ ] Partial-transcript stability ("never un-green"); backtracking-reader behavior
- [ ] WCAG/axe sweep of the new highlight colors; finalize ADR-0007; ROADMAP/CHANGELOG; `v1.4.0` release
