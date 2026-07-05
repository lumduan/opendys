import { codePointOf, isToneMark } from '@/utils/thai';

/**
 * Leniency controls for turning a raw token into a comparison key. Defaults reflect what an ASR
 * hypothesis realistically preserves: case is unreliable, Thai tone marks are frequently wrong or
 * dropped, and punctuation is almost never emitted.
 */
export interface NormalizeOptions {
  /** Lower-case Latin (default true). */
  caseFold?: boolean;
  /** Drop Thai tone marks ่ ้ ๊ ๋ / U+0E48–0E4B (default true). */
  stripThaiTones?: boolean;
  /** Strip leading/trailing punctuation & symbols (default true). */
  stripPunctuation?: boolean;
}

// Keep letters (\p{L}), numbers (\p{N}) AND combining marks (\p{M}) at the edges — a Thai syllable
// can legitimately end in a combining vowel/upper mark (e.g. ก็), which is category Mark, not Letter.
const EDGE_PUNCT_LEADING = /^[^\p{L}\p{N}\p{M}]+/u;
const EDGE_PUNCT_TRAILING = /[^\p{L}\p{N}\p{M}]+$/u;

/**
 * Canonicalize + leniency-fold a raw token into a comparison key.
 *
 * Order: NFC (matches the NFC normalization `useOcr` applies to recognized text) → optional
 * Thai tone strip → optional case-fold → optional edge-punctuation strip. The silent-marker
 * karan (◌์) is deliberately kept — it is orthographically load-bearing, not a tone.
 * Returns '' when the token is pure punctuation/whitespace (the caller drops empty tokens).
 */
export function normalizeToken(token: string, opts: NormalizeOptions = {}): string {
  const { caseFold = true, stripThaiTones = true, stripPunctuation = true } = opts;

  let out = token.normalize('NFC');

  if (stripThaiTones) {
    out = Array.from(out)
      .filter((ch) => !isToneMark(codePointOf(ch)))
      .join('');
  }

  if (caseFold) out = out.toLowerCase();

  if (stripPunctuation) {
    out = out.replace(EDGE_PUNCT_LEADING, '').replace(EDGE_PUNCT_TRAILING, '');
  }

  return out;
}
