/**
 * Pure helpers for the opt-in Typhoon cloud OCR path. The managed `POST /v1/ocr` endpoint returns
 *   { results: [ { success, message: { choices: [ { message: { content } } ] } }, ... ] }
 * — one entry per page. Each `content` is EITHER layout-aware markdown OR a JSON string carrying a
 * `natural_text` field (version/endpoint dependent), so parsing is defensive and falls back to the raw
 * content. The response is untrusted network data, so everything here treats input as `unknown`.
 */

/** Longest-edge target when preparing an image for Typhoon. Float16's hosted variant recommends
 *  ≤1800px per image — the opposite pressure from on-device Tesseract (which wants high-res), so the
 *  cloud path uses its own, smaller prep target. */
export const TYPHOON_MAX_DIM = 1800;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Pull the assistant message content out of one `results[]` entry; null if failed/missing/malformed. */
export function extractEntryContent(entry: unknown): string | null {
  if (!isRecord(entry)) return null;
  if (entry.success === false) return null; // a multi-page PDF can partially fail per entry
  const message = entry.message;
  if (!isRecord(message)) return null;
  const choices = message.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!isRecord(first)) return null;
  const inner = first.message;
  if (!isRecord(inner)) return null;
  return typeof inner.content === 'string' ? inner.content : null;
}

/** Unwrap a Typhoon `content` string: prefer a JSON `natural_text` field, else the raw content. */
export function naturalTextOf(content: string): string {
  try {
    const parsed: unknown = JSON.parse(content);
    if (isRecord(parsed) && typeof parsed.natural_text === 'string') return parsed.natural_text;
  } catch {
    // Not JSON — the content is already plain markdown/text; use it verbatim.
  }
  return content;
}

/** Join every page's natural text from a Typhoon OCR response into one string. */
export function parseTyphoonText(payload: unknown): string {
  const results = isRecord(payload) && Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : [];
  const pages: string[] = [];
  for (const entry of results) {
    const content = extractEntryContent(entry);
    if (content == null) continue;
    const text = naturalTextOf(content).trim();
    if (text) pages.push(text);
  }
  return pages.join('\n\n').trim();
}
