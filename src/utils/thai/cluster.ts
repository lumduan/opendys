import { isThaiCombiningMark, isLeadingVowel, codePointOf } from './thaiChars';

/**
 * Group a string into rendering clusters: a base character followed by any nonspacing
 * combining marks that stack onto it (upper/lower vowels, tone marks, karan).
 *
 * This is an explicit, deterministic equivalent of grapheme-cluster segmentation for the
 * Thai block — every Thai combining mark is a known BMP code point — chosen over
 * `Intl.Segmenter` for determinism, testability, and zero runtime/type coupling
 * (see docs/plans/adr/ADR-0003). Non-Thai characters each become their own cluster.
 */
export function segmentGraphemes(text: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const ch of text) {
    const cp = codePointOf(ch);
    if (isThaiCombiningMark(cp) && current !== '') {
      current += ch;
    } else {
      if (current !== '') out.push(current);
      current = ch;
    }
  }
  if (current !== '') out.push(current);
  return out;
}

/** True when a cluster is exactly one leading vowel (เ แ โ ใ ไ). */
function isLoneLeadingVowel(cluster: string): boolean {
  const cps = Array.from(cluster);
  return cps.length === 1 && isLeadingVowel(codePointOf(cps[0]));
}

/**
 * Segment into *visual syllables*. Thai leading vowels (เ แ โ ใ ไ) are typed and stored
 * before their consonant but render as a single perceived unit with it (e.g. `เก`). Grapheme
 * segmentation emits them separately; this re-merges a lone leading-vowel cluster with the
 * following cluster so color-coding and alignment operate on the unit a reader actually sees.
 */
export function segmentThaiSyllables(text: string): string[] {
  const graphemes = segmentGraphemes(text);
  const out: string[] = [];
  for (let i = 0; i < graphemes.length; i += 1) {
    const g = graphemes[i];
    if (isLoneLeadingVowel(g) && i + 1 < graphemes.length) {
      out.push(g + graphemes[i + 1]);
      i += 1;
    } else {
      out.push(g);
    }
  }
  return out;
}
