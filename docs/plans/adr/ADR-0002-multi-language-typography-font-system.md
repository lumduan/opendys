# ADR-0002 — Multi-Language Typography & Font System

- **Status:** Accepted
- **Date:** 2026-07-03

## Context

Legibility is the core of a dyslexia reading aid, and the two supported scripts have different needs:

- **Latin/English** benefits from fonts with heavily weighted bottoms and disambiguated letterforms
  (e.g. OpenDyslexic).
- **Thai** is a stacking script whose look-alike consonants (ด/ต, ผ/พ, ถ/ภ) are far easier to tell
  apart in a **looped ("มีหัว")** face, where each character's head-loop is explicit.

Because the app must be **offline and zero-egress** (ADR-0001), fonts **cannot** be loaded from
Google Fonts or any CDN — they must be bundled and served same-origin. Users must also be able to
tune size and spacing so characters stop visually overlapping.

## Decision

**We will self-host all fonts via [Fontsource](https://fontsource.org)** (npm `@fontsource/*`), which
emits `@font-face` + `.woff2` into the Vite build with no external requests. All chosen faces are
**SIL OFL-1.1**:

- **English/Latin:** `@fontsource/opendyslexic` (weights 400/700). _OpenDyslexic contains no Thai
  glyphs — it is used for Latin text only._
- **Thai (primary, looped):** `@fontsource/sarabun` — a looped Thai face; the head-loops aid
  disambiguation for dyslexic readers.
- **Thai (alternate):** `@fontsource/mitr` — a rounded, loopless geometric face offered as a style
  choice, not the legibility default.
- A clean system sans-serif remains the fallback for both scripts.

**Text-metrics customization** (FR-04) is implemented as pure functions in
`src/utils/latin/textMetrics.ts` that map user settings (font size, line/word/letter spacing) to
`CSSProperties`, shared across both scripts. A "Looped Font Enforcement" toggle switches the Thai
face to Sarabun.

Thai rendering additionally uses the **4 vertical levels** (below / base / above / tone-top) surfaced
by the parsing engine ([ADR-0003](./ADR-0003-thai-4level-parsing-strategy.md)) for color coding and
optional guide lines.

## Consequences

**Positive**

- Fully offline, zero-egress typography; no CDN dependency.
- Each script gets a genuinely dyslexia-appropriate default; users can still switch faces.
- Spacing/size controls are pure, testable, and reused across languages.

**Negative / trade-offs accepted**

- Bundling multiple weighted font families (Latin + Thai subsets) adds to precache size (mitigated by
  Fontsource per-subset/per-weight CSS so only needed Thai weights ship).
- Two font systems (Latin vs Thai) must be coordinated when a document mixes scripts.

## Alternatives Considered

- **Google Fonts / CDN `@font-face`** — rejected: runtime egress; breaks offline + privacy.
- **A single font for both scripts** — rejected: no single OFL face serves both dyslexia-optimized
  Latin and looped Thai well.
- **Runtime font subsetting** — rejected as premature; Fontsource static subsets are simpler and
  sufficient.
