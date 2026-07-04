import { classifyThaiChar, type ThaiCategory, type ThaiLevel } from './classify';
import { segmentGraphemes, segmentThaiSyllables } from './cluster';
import { clusterHasKaran } from './karan';
import { codePointOf } from './thaiChars';

/** The four color roles of the FR-3 structural parsing model. */
export type ColorRole = 'consonant' | 'vowel' | 'tone' | 'silent' | 'neutral';

/**
 * Default ("classic") FR-3 palette. Reader text is large, so the governing threshold is WCAG
 * **AA-large 3:1**, which all four clear on cupcake + pastel (audited in Phase 5; classic tone-green
 * is 4.42:1 = AA-large, just under AA-normal 4.5:1). The red/green pair is colorblind-confusable, so
 * a colorblind-safe alternative + a non-color underline cue live in `@/utils/reader/palette` and are
 * applied at render time (ColorText).
 *  - consonant → charcoal   - vowel → red   - tone → green   - silent/final → blue
 */
export const THAI_COLORS: Record<ColorRole, string> = {
  consonant: '#2c3e50',
  vowel: '#c0392b',
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
    case 'upperVowel':
    case 'lowerVowel':
      return 'vowel';
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
 * mandatory for correctness: a Thai nonspacing mark (tone / upper-lower vowel / karan) placed in its
 * own colored element detaches from its base and the shaper renders it on a dotted circle. So a base
 * consonant and its stacked marks must share one element — hence one color.
 *
 * Rule (Option A, "faithful"): color by the cluster's base/spacing character — consonant, spacing
 * vowel (leading เ / following า), Thai digit, or other — promoted to `silent` (blue) when the cluster
 * carries a karan (◌์). To instead surface a stacked mark's own color (Option B, "tint the syllable":
 * a cluster with a tone mark → green, with a stacked vowel → red), return the mark's role here.
 */
export function segmentRole(cluster: string): ColorRole {
  const role = roleForCategory(classifyThaiChar(codePointOf(cluster)).category);
  if (role === 'consonant' && clusterHasKaran(cluster)) return 'silent';
  return role;
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
