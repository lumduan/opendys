import type { AlignedPair } from './align';

/**
 * The reading frontier: one past the highest target index the reader has actually reached
 * (aligned to a spoken token, whether correct or mispronounced). Unaligned target tokens BEFORE
 * the frontier were read past without being said → skipped; those AT or AFTER it have not been
 * reached yet → pending. This is what stops the passage tail from flashing red before it is read.
 */
export function readingFrontier(pairs: AlignedPair[]): number {
  let last = -1;
  for (const pair of pairs) {
    if ((pair.op === 'match' || pair.op === 'substitute') && pair.targetIndex !== null) {
      if (pair.targetIndex > last) last = pair.targetIndex;
    }
  }
  return last + 1;
}
