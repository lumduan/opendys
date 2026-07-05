/**
 * Character-level fuzzy string metrics used to tolerate pronunciation variances when matching a
 * spoken token against a target token. Iterates by Unicode code point so Thai (all BMP) and Latin
 * behave identically.
 */

/** Levenshtein edit distance (insert/delete/substitute cost 1) between two strings. */
export function levenshtein(a: string, b: string): number {
  const aChars = Array.from(a);
  const bChars = Array.from(b);
  const n = aChars.length;
  const m = bChars.length;
  if (n === 0) return m;
  if (m === 0) return n;

  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let curr = new Array<number>(m + 1);
  for (let i = 1; i <= n; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= m; j += 1) {
      const cost = aChars[i - 1] === bChars[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

/**
 * Normalized similarity in [0, 1]: `1 - distance / max(len)`. Two empty strings are identical (1);
 * one empty and one non-empty are maximally dissimilar (0).
 */
export function similarity(a: string, b: string): number {
  const max = Math.max(Array.from(a).length, Array.from(b).length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}
