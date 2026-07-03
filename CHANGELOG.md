# Changelog

All notable changes to opendys are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/lumduan/opendys/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lumduan/opendys/releases/tag/v1.0.0
