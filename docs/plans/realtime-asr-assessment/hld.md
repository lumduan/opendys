# HLD — Real-time ASR Reading Assessment

High-Level Design for the reading-practice feature. See [frd.md](./frd.md) for requirements,
[wbs.md](./wbs.md) for the task breakdown, and ADR-0007 for the accepted decisions.

## 1. Purpose & scope

Deliver real-time-ish reading assessment by **micro-batch pseudo-streaming** audio to OpenTyphoon ASR
and aligning the returned transcript against the target text, reusing the v1.2.0 cloud-OCR proxy and
the v1.3.0 karaoke-highlight pipeline.

**Out of scope:** self-hosted true streaming and word-level timestamps (would require a GPU backend —
incompatible with the static-nginx deployment); dictionary Thai word segmentation (stays
[ADR-0003](../adr/ADR-0003-thai-4level-parsing-strategy.md) future work); production reader-page
integration and the analytics dashboard (see [wbs.md](./wbs.md) P3–P4).

## 2. Architectural constraints (non-negotiable)

- Browser calls **only** same-origin `/api/*` → CSP `connect-src 'self'` unchanged (zero-egress by
  default preserved; nginx egresses only when a key is set **and** the user opts in).
- `TYPHOON_API` is **server-side only** (no `VITE_` prefix, never in the bundle, `.dockerignore`d).
- Opt-in + off-by-default, gated by the `/api/ocr-capabilities` `asr` flag.
- All pure logic in `src/utils/asr/**` — no React/DOM/hook imports — under the 90/90/90/80 gate; **no
  `any`**; `tsc -b && vite build` stays green; PWA offline shell intact.
- The **only** HTTP-header change is `Permissions-Policy: microphone=() → microphone=(self)`.

## 3. System data flow

```
mic ─getUserMedia({audio})→ MediaRecorder ──(stop→POST→restart, ~4s windows)──► standalone audio blob
      │                                                                                   │
      │                                                          POST /api/typhoon-asr (multipart file+model)
      │                                                                                   ▼
      │                                          nginx / vite dev proxy  ── injects Authorization: Bearer $TYPHOON_API
      │                                                                                   ▼
      │                                          https://api.opentyphoon.ai/v1/audio/transcriptions
      │                                                                                   │
      ▼                                                                            { text, usage }
 target text ─splitSpeechChunks→ chunks ─tokenizeTarget→ TargetToken[]                    │
      │                                                                   parseAsrText → joinWindows(windows)
      │                                                                                   ▼
      └────────────────────────────────► evaluate(tokens, hypothesis, prevFrontier)  (align → frontier → score)
                                                        │
                          ┌─────────────────────────────┴───────────────────────────┐
                          ▼                                                           ▼
             highlightGroups → useAsrHighlight                          summarize → AsrSession
             (CSS Custom Highlight API over [data-chunk-index])         → localStorage `opendys.asr.v1`
```

Tiling invariant `chunks.map(c => c.raw).join('') === text` gives a stable global-char ↔
(chunk, offset) coordinate system, so `TargetToken.{charIndex,charLength}` map straight into the shared
`buildTextRange` (offsets are absolute into `chunk.raw`, no trim shift).

## 4. Component & module map

**Pure engine — `src/utils/asr/`** (gate-covered, no `any`): `types` · `normalize` · `tokenizeTarget`
· `distance` · `match` · `align` (Needleman–Wunsch, fuzzy substitution) · `frontier` (monotonic reading
frontier) · `session` (`evaluate`/`joinWindows`, the public entry point) · `highlightRanges` · `response`
(`parseAsrText`) · `audio` (mime/filename helpers) · `storage` (`opendys.asr.v1` serialize/parse).

**Browser layer:** `src/services/asr/typhoonAsrClient.ts` (multipart POST, `TyphoonAsrError` kinds) ·
`src/hooks/useAsr.ts` (state machine + `jobId` guard + capture loop) · `src/hooks/useAsrHighlight.ts`
(paints via the shared `buildTextRange` exported from `useWordHighlight.ts`) · `::highlight(asr-*)` in
`src/index.css` · `asr` strings (en+th) in `src/i18n/strings.ts` · `src/pages/AsrPlaygroundPage.tsx`
(`/dev/asr-playground`).

**Infra:** `Dockerfile` (`/api/typhoon-asr` location, `asr` capability field, `microphone=(self)`);
`vite.config.ts` (dev proxy + capability mirror).

## 5. State model

`useAsr` status machine: `idle → requesting → recording → processing → done` (or `→ error`). A monotonic
`jobIdRef` invalidates superseded async work (mirrors `useSpeech`/`useOcr`). `frontierRef` only ever
advances. The client is created lazily on first `start` (React 19 StrictMode-safe); capture is torn down
on unmount. Windows use a **stop→POST→restart** loop — a single `MediaRecorder.start(timeslice)` would
emit header-less continuation blobs the batch endpoint can't decode.

## 6. Privacy & threat model

Voice is more sensitive than an image, so the ADR-0005 posture is reused and tightened: egress only on
opt-in, key never in the bundle, capability-gated visibility, and a persistent consent notice — plus the
browser's own mic permission (now allowed by `microphone=(self)`). When enabled and used, one short
audio window per ~4 s egresses to a third party — the same accepted trade-off as cloud OCR, recorded in
ADR-0007. All session statistics stay on-device.

## 7. Known gaps / blueprint delta (the PoC resolves these)

- **Codec acceptance** — Chrome emits `audio/webm;codecs=opus`, not in Typhoon's listed
  `.wav/.ogg/.opus`; `audio.ts` tries opus-first with an ogg→WAV fallback ladder. **The PoC must verify
  which container the endpoint decodes.**
- **Window-seam loss** — the stop→restart gap drops a little audio; the final in-flight window is
  excluded from the persisted session (tail-drop). Evaluate loop vs cumulative-blob.
- **Thai granularity** — visual-syllable grading may be strict, and ASR returns phrase-level Thai with
  no per-syllable timing (approximate mapping). Dictionary word-seg is ADR-0003 future work.
- **Partial-transcript stability** — the monotonic frontier mitigates tail flicker; consider
  "never un-green" as a hardening step.
- **Persistence** — `localStorage` now; IndexedDB is a future scale-up.
