# Changelog

All notable changes to opendys are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.1] — 2026-07-07

### Fixed

- **Navbar language toggle no longer overflows on narrow phones.** The v1.7.0 navbar `EN`/`TH` shortcut
  caused a ~38 px horizontal overflow at 360 px viewports (the navbar was already near capacity). It now
  appears only at ≥ 400 px; narrower screens switch language via the Settings drawer's Language control
  (the primary control), which works at 360 px. (Found by a headless-Chrome 360 px audit.)

## [1.7.0] — 2026-07-07

### Added

- **Bilingual interface: EN ⇄ TH language switcher.** The entire UI — navbar, home, reader, OCR, ASR
  practice, settings, and errors — now re-skins between English and Thai in one tap. A primary Language
  control lives in the Settings drawer and a compact `EN`/`TH` shortcut in the navbar. On first visit the
  app auto-detects the browser language (any `th-*` locale → Thai); the choice persists across reloads
  (`localStorage` key `opendys.lang.v1`) and `<html lang>` stays in sync for screen-reader pronunciation
  and the Thai `:lang()` font rule. Switching UI language never interrupts an in-flight OCR / ASR /
  read-aloud session (it is separate from the TTS voice language).

### Changed

- **No more hybrid strings.** The English UI no longer carries parenthetical Thai for disambiguation —
  the reader's **Practice reading (ฝึกอ่านออกเสียง)** button is now plain **Practice reading**, and the
  language selectors drop the `"ไทย (Thai)"` parenthetical. Every user-facing string now routes through
  the typed dictionary, and a missing English ↔ Thai counterpart — or an enum ↔ dictionary drift — is a
  compile-time error (`Record<Language, UIStrings>` + `Record<…Key, string>`).

## [1.6.1] — 2026-07-06

### Added

- **Line-by-line practice: auto-stop + voice gauge.** In line-by-line mode the reader no longer has to
  tap **Stop** to end a line — once they've spoken, ~5 s of trailing silence (configurable
  3 / 4 / 5 / 8 / 10 s; 60 s hard cap) finalizes and scores the line automatically, still as one
  recognition request per line. A live **microphone-level gauge** shows the input while recording, and
  the Stop button is relabeled **Done reading** as an explicit manual fallback.

## [1.6.0] — 2026-07-06

### Added

- **Line-by-line reading practice.** A new **Line by line** option in the reader's Practice controls
  (alongside whole-passage): click any line and it is read aloud via TTS (optional — toggle the
  **🔊 TTS preview** off to read cold), then your reading of that one line is recorded and graded —
  accuracy, missed/mispronounced words, and inline green/red coloring — over the same opt-in Typhoon
  ASR path. Each line is a single on-demand recognition request, so feedback stays snappy. (Off by
  default; a deployment without a `TYPHOON_API` key never shows it.)

- **Editable OCR text.** The recognized-text panel now has an **Edit** button next to **Copy**: tap it
  to correct any mis-recognized words or phrases in a textarea, then **Done** to read, hear, copy, or
  practice the corrected text. The Reader already resets any prior assessment when the text changes.

### Changed

- **Reading practice is line-by-line instead of word-by-word.** The previous "word by word" guided
  karaoke mode sent a recognition request for every spoken utterance and blocked the live cursor on
  each server round-trip, which made it laggy and ineffective. It is replaced by the line-by-line mode
  above (one round-trip per line, on demand). The **Skip** button and the "Word X / N" guided-progress
  readout were removed with it.

### Removed

- Word-by-word "guided" practice mode (the karaoke cursor, the **Skip** button, and the per-word
  progress readout) — superseded by line-by-line practice.

## [1.5.0] — 2026-07-05

### Added

- **Guided "word-by-word" reading mode (karaoke read-along).** A new **Word by word** toggle in the
  reader's Practice controls, alongside the existing whole-passage mode: each word (English) or syllable
  (Thai) is highlighted one at a time; when you read it correctly it turns **green** and the cursor
  advances to the next — down to the end — with a running **"Word X / N"** progress, a **Skip** button
  for words to pass, and a completion celebration. It waits on the current word (strict) and advances on
  your natural pauses. Runs through the same opt-in Typhoon ASR path (off by default; server-side key; a
  deployment without a key never shows it).

## [1.4.0] — 2026-07-05

### Added

- **Real-time ASR reading assessment — "Practice Reading" (ฝึกอ่านออกเสียง).** A new opt-in practice
  mode in the reader: press **Practice Reading** on any snippet (an OCR result or manually typed text),
  read it aloud, and each word (English) or syllable (Thai) is graded **green** (read correctly) /
  **red** (skipped or mispronounced) / **neutral** (not yet reached) in real time, alongside a running
  accuracy score and a missed-words list. Speech recognition uses the opt-in
  [Typhoon](https://opentyphoon.ai/) ASR cloud through a same-origin `/api/typhoon-asr` proxy that
  injects the **server-side** `TYPHOON_API` key — never in the client bundle — so the strict
  `connect-src 'self'` CSP is unchanged and a deployment without a key never shows the feature (**off by
  default**). A consent notice is shown while practicing (audio only leaves the device during a session),
  and results are stored **on-device** (`opendys.asr.v1`). Microphone audio is captured as WAV via a
  self-hosted AudioWorklet ([ADR-0007](docs/plans/adr/ADR-0007-optional-cloud-asr-and-microphone.md)).

### Changed

- The hardened `Permissions-Policy` now allows **`microphone=(self)`** (previously disabled) so the
  opt-in Practice mode can access the microphone. Nothing else changed — the mic is used only during a
  practice session, and camera and all other features are unaffected.

## [1.3.0] — 2026-07-04

### Added

- **Karaoke read-aloud** — during Read-Aloud, the word currently being spoken is highlighted in real
  time (Web Speech `onboundary` → CSS Custom Highlight API, so Thai marks stay perfectly stacked). Falls
  back gracefully to the sentence highlight where word boundaries aren't available (e.g. iOS Safari).

### Changed

- **Thai color-coding now distinguishes 6 categories** — consonant, spacing vowel, **upper vowel**,
  **lower vowel**, tone mark, and silent final each get a distinct (AA-large, colorblind-aware) color,
  applied per grapheme cluster so mark stacking stays correct on Safari/iOS + Chrome (ADR-0006).

## [1.2.0] — 2026-07-04

### Added

- **Optional "Enhanced Thai OCR (Cloud)"** — an opt-in [Typhoon](https://opentyphoon.ai/) cloud engine
  for the hard Thai documents on-device Tesseract struggles with. **Off by default**; the toggle appears
  only when a `TYPHOON_API` key is configured. The key is injected **server-side** by nginx via a
  same-origin `/api/typhoon-ocr` proxy — never in the client bundle — so the strict `connect-src 'self'`
  CSP is unchanged and a deployment without a key stays 100% on-device (ADR-0005). Enabling it and running
  a recognition sends that one image to Typhoon, with a clear in-app notice.

### Changed

- The reader's **`system` font** choice now falls back to bundled Sarabun for Thai glyphs, so stacked
  tone-mark + vowel clusters keep correct mark positioning even on systems without a Thai font.

## [1.1.0] — 2026-07-04

### Changed

- **Improved on-device Thai OCR (document photos).** Image prep now scales toward the recognizer's
  resolution sweet spot — **upscaling small crops** (previously it only ever downscaled, starving tiny
  Thai tone marks/vowels) and raising the downscale cap to ~3500 px — with high-quality canvas
  resampling. Recognition uses **AUTO page segmentation (PSM 3)** + `preserve_interword_spaces` +
  `user_defined_dpi`, which cuts the garbage that decorative headers/borders produced (measured: fewer
  noise lines, higher confidence on a real Thai page). Still the `4.0.0_best_int` model — the float
  `tessdata_best` models crash the tesseract.js WASM core (`missing DotProductSSE`).

## [1.0.1] — 2026-07-04

### Fixed

- **Thai tone marks no longer detach onto dotted circles in the color-coded reader.** The 4-level
  color engine rendered every Thai combining mark (tone marks ◌่ ◌้ ◌๊ ◌๋, above/below vowels, and
  การันต์ ◌์) in its own element, which separated it from its base consonant so the browser drew it
  on a dotted-circle placeholder. Coloring is now applied per grapheme cluster, so a base consonant
  and its stacked marks stay in a single shaping run and render correctly. Recognized OCR text is
  also NFC-normalized before display.

### Changed

- Migrated linting to **ESLint 9 flat config** (`eslint.config.js`): unified `typescript-eslint`,
  `eslint-plugin-react-hooks` v5, and `eslint-plugin-react-refresh` 0.5.
- Bumped the CI/Release GitHub Actions to their Node-24 runtimes and the Docker build stage +
  dev compose to `node:24-alpine` (Node 20 is EOL).

## [1.0.0] — 2026-07-03

First public release — a free, 100% client-side, offline dyslexia reading aid for English and Thai.

### Added

- **Offline OCR** — capture (camera) or upload an image and recognize English + Thai text entirely
  on-device with `tesseract.js@7`; the worker, WASM core, and language models are self-hosted with
  zero network egress (ADR-0001, ADR-0004).
- **Thai 4-level orthography engine** — pure, tested utilities that classify Thai characters by their
  vertical level (base / above / below / tone) and color-code consonants, vowels, tone marks, and
  silent finals (การันต์); grapheme clustering with leading-vowel re-merge (ADR-0003).
- **Dyslexia-friendly reader** — self-hosted OpenDyslexic / Sarabun (looped Thai) / Mitr fonts;
  adjustable size, line/word/letter spacing (letter-spacing scoped to Latin so Thai marks stay
  attached); Thai guide lines; a reading ruler (pointer + keyboard); settings persisted to
  localStorage.
- **Offline text-to-speech** — Web Speech API with offline-only (`localService`) voice selection for
  English and Thai, tap-a-sentence + read-aloud with active-chunk highlight, and graceful degrade when
  no offline voice is installed.
- **Colorblind-safe palette** option (Okabe-Ito) plus a non-color underline cue for silent finals;
  WCAG AA-large contrast is codified as a test.
- **Installable PWA** — precached app shell + fonts; the OCR models/WASM are runtime-cached on first
  use; `navigator.storage.persist()` guards against eviction.
- **Hardened delivery** — multi-stage Docker build → non-root nginx on :8080 with a strict
  Content-Security-Policy (`connect-src 'self'` enforces the zero-egress guarantee), Permissions-Policy,
  and other security headers.
- **Engineering system** — `docs/plans/` (ROADMAP, HLD, FRD, WBS, ADRs), GitHub Actions CI
  (lint → typecheck → coverage → build) and a tag-driven GHCR release.

[Unreleased]: https://github.com/lumduan/opendys/compare/v1.6.1...HEAD
[1.6.1]: https://github.com/lumduan/opendys/compare/v1.6.0...v1.6.1
[1.3.0]: https://github.com/lumduan/opendys/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/lumduan/opendys/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lumduan/opendys/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/lumduan/opendys/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/lumduan/opendys/releases/tag/v1.0.0
