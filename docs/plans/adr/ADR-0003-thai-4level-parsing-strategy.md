# ADR-0003 — Thai 4-Level Orthography Parsing Strategy

- **Status:** Accepted
- **Date:** 2026-07-03

## Context

FR-06/FR-07 require isolating Thai characters by their vertical rendering level so they can be
color-coded and aligned to guide lines. Thai stacks glyphs on four levels — below, base, above, and a
tone level above that — and its look-alike consonants are easier to read when vowels, tone marks, and
silent finals are visually distinguished.

Key facts (from research, verified against the Unicode core spec):

- The whole script lives in one BMP block, U+0E00–U+0E7F. No surrogate pairs.
- Category is decidable from code point: consonants `U+0E01–U+0E2E`; leading vowels
  `U+0E40–U+0E44` (spacing); following vowels `U+0E30/0E32/0E33/0E45` (spacing); above marks
  `U+0E31,0E34–0E37,0E47,0E4D,0E4E`; below marks `U+0E38–0E3A`; tone marks `U+0E48–0E4B`;
  karan `U+0E4C`.
- **Leading vowels are stored before their consonant** but render as one perceived unit with it
  (`เ` + `ก` → `เก`). Any segmentation must re-merge them for correct coloring/alignment.
- **การันต์ (explicit silencer)** is Unicode-decidable: a consonant carrying `U+0E4C` is silent.
- **สะกด (live syllable-final consonant)** is **not** decidable from Unicode — Thai omits
  intra-word spaces, so identifying a coda needs syllable/dictionary segmentation.

## Decision

Implement the engine as pure functions in `src/utils/thai/` with these choices:

1. **Category + level by code-point range** (`classify.ts`) → `{ category, level }`, where
   `level ∈ {below, base, above, top}`. This is the source of truth for both color and guide-line
   placement.
2. **Explicit combining-mark grouping instead of `Intl.Segmenter`** (`cluster.ts`). Because every
   Thai combining mark is a known BMP code point, we group `base + trailing marks` directly. This is
   deterministic, unit-testable without ICU, dependency-free, and avoids `Intl.Segmenter`'s
   engine-dependent behavior and TypeScript-lib typing friction under an ES2020 target. A second
   pass (`segmentThaiSyllables`) re-merges a lone leading vowel with the following cluster.
3. **Color model** (`colorTokens.ts`): consonant → charcoal, any vowel → red, tone → green,
   silent/final → blue. A consonant whose cluster carries a karan is colored **silent (blue)** — this
   is the exact case.
4. **สะกด is heuristic and opt-in.** `estimateSyllableFinals` marks the last consonant of each
   whitespace chunk as a probable coda. It is intentionally approximate and **not** wired into the
   default color output; the UI may enable it explicitly. True syllable segmentation (a rule-based
   syllable regex or a ported dictionary segmenter) is a documented future enhancement.

## Consequences

**Positive**

- Fast, deterministic, fully unit-tested engine with no runtime dependencies; ≥90% coverage.
- Correct handling of the leading-vowel reordering gotcha and exact karan silencing.
- Clear separation between what is certain (karan) and what is estimated (สะกด).

**Negative / trade-offs accepted**

- Live syllable-final (สะกด) coloring is not accurate until a real segmenter is added.
- Our manual grouping covers the Thai block precisely but is not a general Unicode grapheme
  segmenter (acceptable — non-Thai text needs no stacking analysis here).

## Alternatives Considered

- **`Intl.Segmenter` for grapheme + word segmentation** — deferred: engine/ICU variance,
  ES2020-lib typing friction, and non-determinism in tests. It remains an option for a future
  dictionary-backed Thai word splitter (its `granularity:'word'` uses ICU's Thai dictionary).
- **Bundling a Thai dictionary segmenter now** (e.g. `wordcut`) — rejected as premature weight; not
  needed for category/level/karan, which are the Phase 2 deliverables.
