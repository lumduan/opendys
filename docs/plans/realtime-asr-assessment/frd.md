# FRD — Real-time ASR Reading Assessment (โหมดฝึกอ่านพร้อมวิเคราะห์ผล)

Functional Requirements for the reading-practice feature. Status uses the
[standard legend](../README.md#status-legend). Cross-references: [hld.md](./hld.md),
[wbs.md](./wbs.md), [ADR-0005](../adr/ADR-0005-optional-cloud-ocr-typhoon.md) (opt-in cloud template),
ADR-0007 (this feature's decision record), [ADR-0003](../adr/ADR-0003-thai-4level-parsing-strategy.md)
(Thai segmentation).

## 1. Product summary

Turn opendys from a passive reader into an **active reading-practice tool**. A learner takes a text
snippet (from OCR or manual input), reads it aloud, and the app checks their reading **in real time**:
each word/syllable turns **green** (read correctly), **red** (skipped or mispronounced), or stays
**neutral** (not yet reached). Speech recognition uses the opt-in **OpenTyphoon ASR** cloud via the
same server-side-key proxy pattern as v1.2.0 cloud OCR. Session results are stored **on-device** for an
offline progress view. Off by default; a deployment without a `TYPHOON_API` key is byte-for-byte the
private, offline default experience.

## 2. Personas

- **Nong (child learner, primary).** Practices reading aloud; needs immediate, low-shame visual
  feedback and encouragement, not a wall of red.
- **Khru (teacher).** Wants an accuracy number and the list of missed words to guide instruction, and
  a history to see progress over sessions.
- **Parent (consent gatekeeper).** Must understand and agree that the child's **voice** leaves the
  device before any audio is sent.

## 3. User stories

- As a learner, I read the text aloud and see each word turn green or red as I go.
- As a learner/teacher, I see an accuracy score and exactly which words were missed or mispronounced.
- As a teacher, I review past sessions offline to track progress.
- As a parent, I am clearly told — and must opt in — before my child's voice is sent to the cloud.
- As a self-hoster, if I set no API key the feature simply does not appear and nothing changes.

## 4. Functional requirements

| ID | Requirement | Status |
| --- | --- | --- |
| FR-ASR-01 | A snippet from OCR (`/read`) or manual input can be sent to a **Practice Reading (ฝึกอ่านออกเสียง)** action. (PoC exposes this at `/dev/asr-playground`; production reader integration is [wbs.md](./wbs.md) P3.) | `[~]` |
| FR-ASR-02 | Starting practice requests **microphone** permission via `getUserMedia`. Denied → `micDenied`; no device / API → `micUnavailable`; both surface a clear, localized message. | `[x]` |
| FR-ASR-03 | Audio is captured in short (~4 s) windows (`MediaRecorder` stop→POST→restart) and each window is transcribed via the same-origin `/api/typhoon-asr` proxy. | `[x]` |
| FR-ASR-04 | Each target token is graded `correct` / `mispronounced` / `skipped` / `pending` and colored green / red (red also carries a non-color wavy-underline cue) / neutral, updating live. | `[x]` |
| FR-ASR-05 | Grading granularity: **English = word**, **Thai = visual syllable** (`segmentThaiSyllables`). A monotonic **reading frontier** keeps not-yet-reached text neutral (never prematurely red). | `[x]` |
| FR-ASR-06 | The app reports an **accuracy %** (correct ÷ reached tokens) and the **list of missed/mispronounced** words. | `[x]` |
| FR-ASR-07 | Each finished session (date, target, accuracy, totals, missed/skipped) is stored **on-device** (`localStorage` key `opendys.asr.v1`, newest-first, capped at 100). An offline stats dashboard consumes it ([wbs.md](./wbs.md) P4). | `[~]` |
| FR-ASR-08 | The feature is **opt-in and off by default**: the client probes `/api/ocr-capabilities` (`asr`); the Practice action appears only when a `TYPHOON_API` key is configured server-side. No key ⇒ graceful 503 ⇒ feature invisible. | `[x]` |
| FR-ASR-09 | Selecting Practice shows a **persistent voice-privacy notice** (audio leaves the device); nothing is sent unless the user both has the feature enabled and starts practicing. | `[x]` |
| FR-ASR-10 | The API key is **never** in the client bundle (`TYPHOON_API`, server-side only); the browser calls **only** same-origin `/api/*`, preserving the `connect-src 'self'` zero-egress guarantee. | `[x]` |
| FR-ASR-11 | Cloud failures map to localized keys: `cloudNotConfigured` (503), `cloudAuth` (401/403), `cloudRateLimit` (429), `cloudFailed` (other/network). | `[x]` |

## 5. Evaluation matrix

Target and hypothesis are tokenized identically (EN word / TH syllable, NFC + case-fold + tone-strip +
edge-punctuation leniency), then aligned with a fuzzy token edit-distance (Needleman–Wunsch,
substitution cost `1 − similarity`).

| Outcome | Condition | Highlight |
| --- | --- | --- |
| `correct` | Aligned to a spoken token with similarity ≥ threshold (default **0.7**) | Green |
| `mispronounced` | Aligned but similarity < threshold | Red + wavy underline |
| `skipped` | No spoken token aligned, but the reader has moved past it (index < frontier) | Red + wavy underline |
| `pending` | At/after the reading frontier — not yet reached | Neutral (+ `asr-current` cursor on the next token) |

**Accuracy** = correct ÷ **reached** (frontier) tokens — unread text never counts against the reader.
Extra spoken words (stutters, repeats, window-seam duplication) align as cost-free inserts and do not
penalize the target.

## 6. Statistics parameters (`AsrSession`)

`id`, `date` (ISO), `lang` (`en`|`th`), `target`, `accuracy` (0–1), `totalTokens`, `correct`,
`mispronounced[]`, `skipped[]`. Stored under `opendys.asr.v1` as `{ version: 1, sessions: [...] }`,
newest-first, capped at **100** sessions. Purely local; never transmitted. IndexedDB is a future
scale-up (recorded in ADR-0007).

## 7. Non-functional requirements

- **Latency.** Perceived lag ≈ one window (~4 s) + round-trip; windows keep request rate ≈ 15/min,
  far under Typhoon's 100 req/min.
- **Privacy.** Voice is more sensitive than an image: opt-in + off-by-default + capability-gated +
  persistent consent notice, on top of the browser's own mic permission.
- **Accessibility.** New highlight colors meet the same WCAG AA-large 3:1 bar as the palette; red
  carries a non-color (wavy-underline) cue (WCAG 1.4.1), matching the silent-role underline.
- **Offline / no-regression.** The PWA app shell is unaffected; with no key or no network the feature
  degrades gracefully (unavailable / `cloudFailed`) and the rest of the app stays fully offline.
- **Standards.** React 19 + TS strict, no `any`; all pure logic in `src/utils/asr/**` under the
  90/90/90/80 coverage gate; `npm run build` stays green.
