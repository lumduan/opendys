# opendys

**A free, 100% client-side dyslexia reading aid for English and Thai.** Capture or paste text, then
read it in a deeply customizable, dyslexia-friendly interface — with offline OCR, color-coded Thai
orthography, a reading ruler, and text-to-speech. Everything runs in your browser. Nothing you scan
or read ever leaves your device.

[![CI](https://github.com/lumduan/opendys/actions/workflows/ci.yml/badge.svg)](https://github.com/lumduan/opendys/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![100% client-side](https://img.shields.io/badge/backend-none-brightgreen)
![offline](https://img.shields.io/badge/works-offline-brightgreen)

![opendys reader — Thai 4-level color coding and dyslexia fonts](docs/assets/reader.png)

## Why

Reading tools for dyslexia are often paid, cloud-based, and English-only. opendys is free,
open-source, and **private by design** — and it treats **Thai** as a first-class script, handling its
4-level vertical orthography (base consonants, vowels, tone marks, and silent finals) that generic
tools ignore.

## Features

- **Offline OCR** — snap a photo or upload an image; recognize English + Thai text on-device with
  Tesseract.js. No image is ever uploaded.
- **Thai 4-level color coding** — consonants, vowels, tone marks, and silent finals (การันต์) are
  colored and cued, with an optional **colorblind-safe** palette and a non-color underline for silent
  letters.
- **Dyslexia-friendly reader** — OpenDyslexic / looped Thai (Sarabun) / Mitr fonts; adjustable size,
  line, word, and letter spacing; optional Thai guide lines.
- **Reading ruler** — a dimming band that follows your pointer or the keyboard to keep your place.
- **Read aloud** — offline text-to-speech in English and Thai, tap a sentence or play the whole
  passage.
- **Installable PWA** — works offline after the first visit; install it like an app.

## Privacy

opendys is **zero-egress**. There is no backend, no telemetry, and no analytics. The OCR engine,
language models, and fonts are all **self-hosted** — the app never contacts a third-party server.
The production build ships a strict Content-Security-Policy whose `connect-src 'self'` makes the
browser **enforce** this: any attempt to reach an external host is blocked.

## Quick start

Run the published image:

```sh
docker run --rm -p 8080:8080 ghcr.io/lumduan/opendys:latest
# open http://localhost:8080
```

Or build and run locally:

```sh
docker compose --profile prod up --build
# open http://localhost:8080
```

> The app shell, reader, fonts, and text-to-speech work fully offline immediately. The OCR language
> models (~24 MB) are cached the first time you run a recognition, so the **first** OCR needs a
> connection; after that, OCR works offline too.

## Development

Requires Node 20+ and npm.

```sh
npm install
npm run dev          # http://localhost:5173  (or: docker compose up)
```

Quality gates (CI runs all of these):

```sh
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

## How it works

- **React 19 + TypeScript + Vite 5**, styled with **Tailwind CSS v3 + DaisyUI v4** (accessible pastel
  themes).
- **OCR**: `tesseract.js@7` in its own Web Worker; the worker, WASM core, and `eng`/`tha` models are
  copied into the build and served same-origin (see
  [ADR-0004](docs/plans/adr/ADR-0004-ocr-model-packaging.md)).
- **Thai engine**: pure, unit-tested utilities in `src/utils/thai/` that classify characters by
  vertical level and produce the color model (see
  [ADR-0003](docs/plans/adr/ADR-0003-thai-4level-parsing-strategy.md)).
- **Fonts**: self-hosted via `@fontsource` (SIL OFL) — no CDN.
- **PWA**: `vite-plugin-pwa` (Workbox) precaches the shell + fonts and runtime-caches the OCR assets.
- **Delivery**: multi-stage Docker build → non-root nginx on port 8080 with hardened security headers.

Design decisions and the full roadmap live in [`docs/plans/`](docs/plans/) (HLD, FRD, WBS, ADRs).

## Self-hosting & customizing

- **Behind HTTPS**: opendys serves plain HTTP on `:8080` for a TLS-terminating reverse proxy to sit in
  front of. Add `Strict-Transport-Security` at that edge (it's intentionally not set in-container).
- **Add a language**: see [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-language) — drop in a Tesseract
  model, add UI strings, and (for a new script) a font.

## Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Keep everything client-side, offline, and private.

## License

[MIT](LICENSE) © opendys contributors. Bundled models and fonts retain their own licenses
(Apache-2.0 and SIL OFL-1.1 respectively).
