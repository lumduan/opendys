# ADR-0007 — Optional Opt-In Cloud ASR (Typhoon) + Microphone, with a Server-Side Key

- **Status:** Accepted — extends [ADR-0005](./ADR-0005-optional-cloud-ocr-typhoon.md) to a second
  modality (voice) and amends [ADR-0001](./ADR-0001-client-side-ocr-architecture.md) (the zero-egress
  guarantee still holds **by default**; an opt-in path may egress short audio clips when the user
  practices). Grading granularity references [ADR-0003](./ADR-0003-thai-4level-parsing-strategy.md).
- **Date:** 2026-07-04

## Context

opendys is a passive reader. To support **active** reading practice we add a real-time ASR reading
assessment: the learner reads a snippet aloud and each word/syllable is graded green / red / neutral as
they go (see `docs/plans/realtime-asr-assessment/`). Speech recognition needs a Thai-capable ASR that
cannot run in the browser, so — like cloud OCR (ADR-0005) — it uses a cloud API. This introduces two new
concerns beyond ADR-0005: the input is **microphone audio** (more sensitive than a page image), and the
transport is **audio streaming** rather than a single upload.

Two findings shaped the design (verified live, see `.../PoC/README.md`):

1. The hosted Typhoon ASR API is **OpenAI-compatible batch transcription** (`/v1/audio/transcriptions`),
   with **no hosted WebSocket** — true streaming would require self-hosting a GPU model.
2. The endpoint validates the upload's **Content-Type** and **rejects `audio/webm`** — the default
   output of Chrome's `MediaRecorder` — while accepting `audio/wav` and `audio/ogg;codecs=opus`.

## Decision

**Offer ASR as an explicitly opt-in "Practice Reading (ฝึกอ่านออกเสียง)" feature, OFF by default, with
the API key injected server-side — reusing the ADR-0005 proxy pattern.** On-device reading stays the
default; a deployment with no key never shows the feature.

- **Server-side key via the existing proxy.** A same-origin `POST /api/typhoon-asr` location proxies to
  Typhoon and injects `Authorization: Bearer $TYPHOON_API` (the same key as cloud OCR). The browser only
  ever calls same-origin `/api/…`, so `connect-src 'self'` is unchanged and the browser-level zero-egress
  guarantee holds — only nginx egresses, and only when the user opts in.
- **Off by default, discoverable only when configured.** The client probes `/api/ocr-capabilities`
  (now `{ typhoon, asr }`); the Practice action appears only when a key is set. No key ⇒ 503 ⇒ the app
  stays 100% on-device.
- **Explicit consent.** Starting practice shows a persistent notice that short audio clips are sent to
  opentyphoon.ai; nothing is sent unless the user both enables the feature and starts practicing.
- **Microphone enabled deliberately.** The hardened `Permissions-Policy` changes `microphone=()` →
  `microphone=(self)` (camera was already `camera=(self)`). CSP is otherwise unchanged.
- **Micro-batch pseudo-streaming.** Capture ~4 s windows and POST each through the proxy (the batch API
  has no streaming interface); accumulate the transcript and re-align it against the target each window.
- **WAV/PCM capture (not MediaRecorder).** Because Chrome's `audio/webm` is rejected, capture mono PCM
  via a self-hosted AudioWorklet and encode WAV per window (accepted on every browser); the worklet is
  same-origin, so `script-src 'self'` is unchanged.
- **EN-word / TH-syllable grading.** English aligns at word granularity; Thai at visual-syllable
  granularity (`segmentThaiSyllables`) — there is no Thai word segmenter (ADR-0003 future work).
- **On-device stats.** Sessions persist to `localStorage` (`opendys.asr.v1`); IndexedDB is a future
  scale-up.

## Consequences

**Positive**

- Turns a passive reader into an active practice tool while keeping the private, offline default intact.
- Reuses the proven ADR-0005 server-side-key proxy, capability probe, and consent pattern; the key is
  never in the bundle; CSP and zero-egress-by-default are preserved.
- Self-hosters opt in with the single existing env var; omitting it changes nothing.

**Negative / trade-offs accepted**

- When enabled and used, short audio clips egress to a third party — a real, user-visible departure from
  "nothing ever leaves the device", and voice is more sensitive than an image. Mitigated by opt-in +
  off-by-default + a clear notice + the browser's own mic permission.
- Pseudo-streaming latency ≈ one window + round-trip (not true streaming). The final in-flight window is
  excluded from the persisted session (tail-drop).
- WAV uploads are larger than compressed opus; capture runs an AudioWorklet.

## Alternatives Considered

- **Self-host the streaming ASR model** — rejected: needs a GPU backend, incompatible with the static
  nginx site (same rationale as ADR-0005's self-host rejection).
- **Client-side key / direct browser→Typhoon** — rejected: leaks the key on a public site and violates
  `connect-src 'self'` (same as ADR-0005).
- **Browser `SpeechRecognition` (Web Speech API)** — rejected: Chrome routes audio to Google servers
  (breaks the private default and offline story) and offers no control over target alignment.
- **Raw MediaRecorder upload (webm/opus)** — rejected: the endpoint returns 415 for `audio/webm`
  (verified); it only works on Firefox's ogg/opus. WAV/PCM works everywhere.
- **True WebSocket streaming** — not offered by the hosted API.
