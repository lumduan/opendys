import { isKaran, isThaiConsonant, codePointOf } from './thaiChars';
import { segmentGraphemes } from './cluster';

/** True when a rendering cluster contains a thanthakhat / karan mark (◌์). */
export function clusterHasKaran(cluster: string): boolean {
  for (const ch of cluster) {
    if (isKaran(codePointOf(ch))) return true;
  }
  return false;
}

/**
 * Identify **silenced consonants** — the exact, Unicode-decidable case of a silent final
 * (การันต์): a consonant whose cluster carries a karan mark. Returns one boolean per
 * grapheme cluster (from {@link segmentGraphemes}); `true` marks a karan-silenced consonant.
 */
export function markSilentConsonants(text: string): boolean[] {
  return segmentGraphemes(text).map(
    (cluster) => isThaiConsonant(codePointOf(cluster)) && clusterHasKaran(cluster),
  );
}

/**
 * Best-effort estimate of live syllable-final consonants (สะกด). Unlike การันต์, these are
 * NOT decidable from Unicode alone — Thai writes no intra-word spaces, so identifying a
 * closing coda consonant requires syllable/phonotactic segmentation. This heuristic marks the
 * last base consonant of each whitespace-delimited chunk and is intentionally approximate;
 * it is exposed for optional UI use, not wired into the default color model (see ADR-0003).
 */
export function estimateSyllableFinals(text: string): number[] {
  const finals: number[] = [];
  const chunks = text.split(/(\s+)/);
  let offset = 0;
  for (const chunk of chunks) {
    if (chunk.trim().length > 0) {
      let lastConsonantIndex = -1;
      let idx = offset;
      for (const ch of chunk) {
        if (isThaiConsonant(codePointOf(ch))) lastConsonantIndex = idx;
        idx += ch.length;
      }
      // A single-consonant chunk has no coda to mark.
      if (lastConsonantIndex > offset) finals.push(lastConsonantIndex);
    }
    offset += chunk.length;
  }
  return finals;
}
