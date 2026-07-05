import { similarity } from './distance';

/**
 * Similarity at or above which a spoken token counts as a correct rendition of a target token.
 * Below it, an aligned pair is graded "mispronounced" rather than "correct".
 */
export const DEFAULT_MATCH_THRESHOLD = 0.7;

/** True when `hyp` is a good-enough rendition of `target` (similarity ≥ threshold). */
export function tokensMatch(target: string, hyp: string, threshold: number = DEFAULT_MATCH_THRESHOLD): boolean {
  return similarity(target, hyp) >= threshold;
}
