/**
 * Text splitting helpers for tap-to-speak TTS and reading-ruler line targeting (FR-08/FR-09).
 * These are script-agnostic and dependency-free.
 */

/** Split into lines, preserving neither trailing empties beyond the natural split. */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Whitespace-delimited words. For English this is true word segmentation; for Thai — which
 * omits intra-phrase spaces — it yields phrase-level chunks. Dictionary-based Thai word
 * segmentation is a documented future enhancement (see ADR-0003).
 */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

/** Split into sentences on `. ! ? …` and the Thai paiyannoi `ฯ`, keeping trailing punctuation. */
export function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?…ฯ]+[.!?…ฯ]*/g);
  if (!matches) return [];
  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}
