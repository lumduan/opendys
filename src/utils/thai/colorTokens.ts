import { classifyThaiChar, type ThaiCategory, type ThaiLevel } from './classify';
import { segmentThaiSyllables } from './cluster';
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
