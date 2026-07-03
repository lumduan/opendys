/**
 * Tidy raw OCR output for display. Script-safe: it only trims/normalizes whitespace the OCR
 * already emitted and NEVER inserts spaces (Thai has no intra-word spaces, so word-joining
 * would corrupt it).
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n') // CRLF / CR -> LF
    .replace(/\f/g, '\n') // form feed -> newline
    .replace(/[^\S\n]+$/gm, '') // trailing horizontal whitespace (space/tab/NBSP) per line
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines to a single blank line
    .trim();
}
