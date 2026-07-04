# Changelog

All notable changes to opendys are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/lumduan/opendys/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/lumduan/opendys/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lumduan/opendys/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/lumduan/opendys/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/lumduan/opendys/releases/tag/v1.0.0
