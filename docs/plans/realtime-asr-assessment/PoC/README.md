# PoC — Real-time ASR reading assessment: capture codec & connection

## Hypothesis

The browser can capture microphone audio in short windows and send them to the hosted OpenTyphoon ASR
API (through the same-origin proxy) in a format the endpoint accepts, so the returned transcript can
drive real-time reading assessment against the target text.

## What was tried

- Confirmed the hosted API shape: `POST https://api.opentyphoon.ai/v1/audio/transcriptions`,
  OpenAI-compatible, model `typhoon-asr-realtime`, multipart `file` + `model`, `Authorization: Bearer`,
  ~100 req/min, no hosted WebSocket → **micro-batch** (~4 s windows).
- Probed the **live** endpoint (2026-07-04) with synthetic 3 s clips (ffmpeg sine tone) in each
  candidate container, varying the multipart part's declared **Content-Type** — which is exactly what
  the browser's `FormData.append('file', blob, name)` sends as `blob.type`. (Key read from `.env`
  server-side; never printed.)

## Result

The endpoint validates the **part Content-Type**, not the filename (a `clip.wav` sent as
`application/octet-stream` was rejected). Acceptance matrix:

| Declared Content-Type | Bytes | HTTP | Note |
| --- | --- | --- | --- |
| `application/octet-stream` (curl default) | any | 400 | "Supported formats: wav, flac, mp3, ogg, opus" |
| `audio/webm;codecs=opus` — **Chrome MediaRecorder default** | webm/opus | **415** | "Unsupported file type .webm" |
| `audio/webm` | webm | 400 | not supported |
| `audio/ogg;codecs=opus` — **Firefox default** | ogg/opus | **200** | decoded (`audio_tokens` > 0) |
| `audio/ogg` | ogg | 200 | accepted |
| `audio/wav` — our PCM fallback | wav | **200** | accepted |
| `audio/wave` | wav | 200 | accepted |
| `audio/mpeg` | mp3 | 400 | not accepted under this MIME string |

Consequences:

- **Chrome's MediaRecorder output (webm/opus) is rejected**, and Chrome cannot *record* `audio/ogg`, so
  a MediaRecorder-only capture works on Firefox only.
- **`audio/wav` is accepted on every browser.** So capture PCM via a Web Audio **AudioWorklet** and
  encode a 16-bit WAV per window (`src/utils/asr/wav.ts`). The worklet is self-hosted at
  `public/asr-recorder.worklet.js`, so it loads under `script-src 'self'` with **no CSP change**.
- The 200 responses returned `{ "text": "", ... "audio_tokens": 150 }` — empty text (it was a tone) but
  proof the container decoded.

## Verdict

**Proceed** with the **WAV/PCM AudioWorklet** capture path (implemented in this pass), not raw
MediaRecorder. Recorded in [ADR-0007](../../adr/ADR-0007-optional-cloud-asr-and-microphone.md).

Still to confirm **in-browser** (needs a real mic + key): end-to-end live read (mic → windows →
green/red highlight) on Chrome and Safari; window-seam continuity and the persisted-session tail-drop
(final in-flight window is excluded from the saved `AsrSession`); and whether Thai visual-syllable
grading feels right. The pure alignment engine is unit-tested at 100%.
