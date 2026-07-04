import { classifyThaiChar, type ThaiCategory, type ThaiLevel } from './classify';
import { segmentGraphemes, segmentThaiSyllables } from './cluster';
import { clusterHasKaran } from './karan';
import { codePointOf, isToneMark, isUpperMark, isLowerMark } from './thaiChars';

/** Structural color roles. Spacing vowels (leading เ / following า) share `vowel`; the above/below
 *  combining vowels and tone marks get their OWN roles so each category reads distinctly. */
export type ColorRole =
  | 'consonant'
  | 'vowel'
  | 'upperVowel'
  | 'lowerVowel'
  | 'tone'
  | 'silent'
  | 'neutral';

/**
 * Default ("classic") palette. Reader text is large, so the governing threshold is WCAG **AA-large
 * 3:1** on cupcake + pastel (codified in `palette.test.ts` / `contrast.test.ts`). A colorblind-safe
 * (Okabe-Ito) variant + a non-color underline cue for silents live in `@/utils/reader/palette`.
 *  - consonant → charcoal · vowel (spacing) → red · upper vowel → purple · lower vowel → dark orange
 *  · tone → green · silent/final → blue
 */
export const THAI_COLORS: Record<ColorRole, string> = {
  consonant: '#2c3e50',
  vowel: '#c0392b',
  upperVowel: '#8e44ad',
  lowerVowel: '#b45309',
  tone: '#1e8449',
  silent: '#1f618d',
  neutral: 'currentColor',
};

export interface ColorToken {
  /** A single code point of the source text. */
  char: string;
  code: number;
  category: ThaiCategory;
  level: ThaiLevel;
  role: ColorRole;
  color: string;
  /** Index of the visual syllable (from {@link segmentThaiSyllables}) this token belongs to. */
  clusterIndex: number;
}

export interface ColorCluster {
  text: string;
  tokens: ColorToken[];
}

function roleForCategory(category: ThaiCategory): ColorRole {
  switch (category) {
    case 'consonant':
      return 'consonant';
    case 'leadingVowel':
    case 'followingVowel':
      return 'vowel';
    case 'upperVowel':
      return 'upperVowel';
    case 'lowerVowel':
      return 'lowerVowel';
    case 'toneMark':
      return 'tone';
    case 'karan':
      return 'silent';
    default:
      return 'neutral';
  }
}

/**
 * Produce the FR-3 render model: one {@link ColorToken} per code point, grouped by visual
 * syllable. A consonant whose cluster carries a karan mark is a silenced/final consonant and
 * is colored `silent` (blue) rather than the default consonant charcoal.
 */
export function toColorTokens(text: string): ColorToken[] {
  const clusters = segmentThaiSyllables(text);
  const tokens: ColorToken[] = [];

  clusters.forEach((cluster, clusterIndex) => {
    const silenced = clusterHasKaran(cluster);
    for (const ch of cluster) {
      const code = codePointOf(ch);
      const { category, level } = classifyThaiChar(code);
      let role = roleForCategory(category);
      if (silenced && category === 'consonant') role = 'silent';
      tokens.push({ char: ch, code, category, level, role, color: THAI_COLORS[role], clusterIndex });
    }
  });

  return tokens;
}

/** Group the flat token stream by visual syllable, for per-cluster rendering/alignment. */
export function toColorClusters(text: string): ColorCluster[] {
  const clusters: ColorCluster[] = [];
  for (const token of toColorTokens(text)) {
    let cluster = clusters[token.clusterIndex];
    if (!cluster) {
      cluster = { text: '', tokens: [] };
      clusters[token.clusterIndex] = cluster;
    }
    cluster.text += token.char;
    cluster.tokens.push(token);
  }
  return clusters;
}

/**
 * A single render segment: one grapheme cluster (a base character plus any nonspacing marks that
 * stack onto it) or one spacing glyph, carrying the ONE color role the whole segment is drawn in.
 */
export interface RenderSegment {
  text: string;
  role: ColorRole;
}

/**
 * Choose the single color role for a whole grapheme cluster. Coloring at cluster granularity is
 * MANDATORY: a Thai nonspacing mark (tone / upper-lower vowel / karan) placed in its OWN colored
 * element detaches from its base onto a dotted circle on WebKit/Safari (Blink tolerates it, WebKit
 * does not — see ADR-0006). So a base + its stacked marks share one span, hence one color.
 *
 * To keep each category visually distinct within that constraint, the cluster is colored by its MOST
 * SALIENT mark — priority `silent (karan) > tone > upper vowel > lower vowel` — falling back to the
 * base/spacing character's own role (consonant, spacing vowel, digit/other).
 */
export function segmentRole(cluster: string): ColorRole {
  if (clusterHasKaran(cluster)) return 'silent';
  let hasTone = false;
  let hasUpper = false;
  let hasLower = false;
  for (const ch of cluster) {
    const cp = codePointOf(ch);
    if (isToneMark(cp)) hasTone = true;
    else if (isUpperMark(cp)) hasUpper = true;
    else if (isLowerMark(cp)) hasLower = true;
  }
  if (hasTone) return 'tone';
  if (hasUpper) return 'upperVowel';
  if (hasLower) return 'lowerVowel';
  return roleForCategory(classifyThaiChar(codePointOf(cluster)).category);
}

/**
 * The DOM-safe render model for {@link ColorText}: one {@link RenderSegment} per grapheme cluster
 * (from {@link segmentGraphemes}), so a base and its combining marks always render in a single
 * shaping run. Contrast {@link toColorTokens}, which splits every code point for analysis/tests and
 * must NOT drive the DOM (it detaches Thai marks onto dotted circles).
 */
export function toRenderSegments(text: string): RenderSegment[] {
  return segmentGraphemes(text).map((cluster) => ({ text: cluster, role: segmentRole(cluster) }));
}
