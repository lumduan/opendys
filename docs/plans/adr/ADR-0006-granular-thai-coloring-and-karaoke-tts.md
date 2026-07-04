# ADR-0006 — Granular Thai Category Coloring & Karaoke TTS Highlight (client-side rendering)

- **Status:** Accepted — refines [ADR-0003](./ADR-0003-thai-4level-parsing-strategy.md) (the 4-level model
  now renders **6** distinct category colors, still one span per grapheme cluster)
- **Date:** 2026-07-04

## Context

Two reader upgrades needed client-side rendering decisions that hinge on one hard browser constraint.

**1. Distinct colors per Thai mark category.** Users wanted upper vowels, lower vowels, and tone marks each
in their own color (not all collapsed to `vowel` / inheriting the base). The obvious implementation — wrap
each mark in its own colored `<span>` — is exactly the bug fixed in v1.0.1: a Thai nonspacing mark in its
own inline element **detaches from its base onto a dotted circle on WebKit/Safari**. Browser spikes confirmed
Blink (Chrome) shapes marks across span boundaries but **WebKit (Safari/iOS) does not**, and the CSS Custom
Highlight API's `color` does not recolor combining marks. So true per-*individual-mark* coloring is not
achievable cross-browser without canvas (which forfeits text selection and breaks §2's char mapping).

**2. Karaoke word highlight during Read-Aloud.** Highlight each word as it is spoken. Wrapping words in
elements is unsafe for the same shaping reason, and Web Speech `onboundary` word events are unreliable on
Safari/iOS and for many offline voices.

## Decision

**1. Color at grapheme-cluster granularity, by the cluster's most-salient mark.** `ColorText` keeps **one
`<span>` per grapheme cluster** (base + its stacked marks = one shaping run = correct on every engine). The
palette gains `upperVowel` + `lowerVowel` roles (6 structural colors + `neutral`); `segmentRole` colors a
cluster by priority **`silent > tone > upper vowel > lower vowel > base/spacing`**. A stacked syllable shows
its top-priority mark's color. Both the classic and colorblind-safe (Okabe-Ito) palettes define all roles;
the WCAG **AA-large (3:1)** contrast test gates them.

**2. Karaoke via `onboundary` + a DOM Range + the CSS Custom Highlight API.** `useSpeech` records
`activeWord` (`charIndex`/`charLength`) from `onboundary`; `useWordHighlight` maps it (correcting the
`raw.trim()`-vs-rendered-`raw` offset) to a `Range` over the active chunk's text nodes and paints it with
`::highlight(reader-word)` `background-color`. This highlights a **text range, not an element**, so Thai
shaping is untouched and the category colors show through. **Graceful fallback:** where `onboundary` never
fires or the API is absent (iOS Safari, older browsers), `activeWord` stays null → the existing
sentence-level `--active` highlight (driven by the reliable `onstart`) simply remains.

## Consequences

**Positive**

- Distinct category colors AND perfect mark stacking on Safari/iOS + Chrome; text stays selectable.
- Karaoke tracking where supported, with a zero-config graceful degrade elsewhere — one code path.
- Reuses the tested palette/contrast infrastructure; the Highlight-API approach needs no DOM mutation
  (memo-safe) and composes with the category colors.

**Negative / trade-offs accepted**

- Not true per-individual-mark colors: a syllable stacking two marks shows only the salient one; a
  mark-carrying consonant borrows the mark's color.
- 6 structural colors can look busy / be colorblind-confusable — mitigated by the Okabe-Ito variant, the
  contrast test, and spatial position (upper vs lower marks are physically separated).
- Karaoke is unavailable on typical iOS Safari + offline Thai voices (a Web Speech limitation, not ours).

## Alternatives Considered

- **Per-individual-mark colored spans** — rejected: reintroduces the WebKit dotted-circle bug (spike-proven).
- **CSS Custom Highlight API `color` for per-mark tint** — rejected: does not recolor combining marks (spike).
- **Canvas glyph rendering** — rejected: forfeits text selection/accessibility and breaks the karaoke
  `charIndex → node` mapping.
- **Wrapping each word for karaoke** — rejected: element boundaries break Thai shaping on WebKit.
