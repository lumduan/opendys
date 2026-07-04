/**
 * Pure helpers for mapping a Web Speech `onboundary` word event to a character range in the rendered
 * chunk. The spoken string is `chunk.speak = raw.trim()`, but the DOM renders the untrimmed `chunk.raw`,
 * so a `charIndex` from the event must be shifted by the leading whitespace `.trim()` removed. The
 * actual highlighting (DOM Range + CSS Custom Highlight API) lives in the browser-only `useWordHighlight`
 * hook; keeping this math pure makes it unit-testable.
 */

/** Shift a trimmed-string `charIndex` to an offset into the untrimmed rendered `raw`. */
export function rawWordOffset(raw: string, charIndex: number): number {
  const leadingWhitespace = raw.length - raw.trimStart().length;
  return charIndex + leadingWhitespace;
}

/**
 * Resolve the `[start, end)` character span of the spoken word within `raw`. `charLength` is 0 or
 * missing in some speech engines — then extend from the word start to the next whitespace (word
 * boundary) or the end of the chunk. Always clamped to `raw`'s bounds; `end <= start` means "nothing
 * to highlight" (the caller then clears the highlight).
 */
export function wordRange(
  raw: string,
  charIndex: number,
  charLength: number,
): { start: number; end: number } {
  const start = Math.max(0, Math.min(rawWordOffset(raw, charIndex), raw.length));
  let end: number;
  if (Number.isFinite(charLength) && charLength > 0) {
    end = Math.min(start + charLength, raw.length);
  } else {
    const nextWs = raw.slice(start).search(/\s/);
    end = nextWs === -1 ? raw.length : start + nextWs;
  }
  return { start, end };
}
