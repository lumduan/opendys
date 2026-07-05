/**
 * Parse the transcript out of an OpenAI-compatible ASR response (`{ text, usage }`). The payload is
 * untrusted network JSON, so it is typed `unknown` and every access is defensive; anything
 * unexpected yields ''. Mirrors the shape of `parseTyphoonText` in `src/utils/ocr/`.
 */
export function parseAsrText(payload: unknown): string {
  if (payload === null || typeof payload !== 'object') return '';
  const text = (payload as { text?: unknown }).text;
  return typeof text === 'string' ? text : '';
}
