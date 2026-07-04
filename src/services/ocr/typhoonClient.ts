import { parseTyphoonText, TYPHOON_MAX_DIM, type OcrLanguage } from '@/utils/ocr';
import { prepareForOcr } from './imagePrep';
import type { OcrEngine, ProgressCallback, RecognizeResult } from './tesseractClient';

/** Failure modes surfaced to the UI. The browser only ever talks to the same-origin nginx proxy; the
 *  proxy injects the API key and forwards to Typhoon, so `notConfigured` (503) means the server has no
 *  key set, and `auth` (401/403) means the configured key was rejected. */
export type TyphoonErrorKind = 'notConfigured' | 'auth' | 'rateLimit' | 'failed';

export class TyphoonError extends Error {
  constructor(readonly kind: TyphoonErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'TyphoonError';
  }
}

/** Same-origin proxy (nginx / vite dev). The API key is injected server-side — never in this bundle. */
const ENDPOINT = '/api/typhoon-ocr';

/**
 * Opt-in cloud OCR via OpenTyphoon, shaped like {@link TesseractClient} so the hook can swap engines.
 * Stateless: each call POSTs the prepared image to the same-origin proxy and parses the response.
 * `lang` is unused (the VLM auto-detects script) but kept for interface parity.
 */
export class TyphoonClient implements OcrEngine {
  async recognize(
    image: Blob,
    _lang: OcrLanguage,
    onProgress?: ProgressCallback,
  ): Promise<RecognizeResult> {
    onProgress?.({ phase: 'preparing', percent: 0, messageKey: 'initializing' });
    // Cloud wants a SMALLER image than on-device Tesseract (≤1800px), so use the Typhoon prep target.
    const prepared = await prepareForOcr(image, TYPHOON_MAX_DIM);

    const form = new FormData();
    form.append('file', prepared, 'page.png');
    form.append('model', 'typhoon-ocr');
    form.append('max_tokens', '16384');
    form.append('temperature', '0.1');
    form.append('top_p', '0.6');
    form.append('repetition_penalty', '1.2');

    onProgress?.({ phase: 'recognizing', percent: 40, messageKey: 'recognizing' });

    let res: Response;
    try {
      res = await fetch(ENDPOINT, { method: 'POST', body: form });
    } catch {
      throw new TyphoonError('failed', 'network error');
    }

    if (!res.ok) {
      if (res.status === 503) throw new TyphoonError('notConfigured');
      if (res.status === 401 || res.status === 403) throw new TyphoonError('auth');
      if (res.status === 429) throw new TyphoonError('rateLimit');
      throw new TyphoonError('failed', `HTTP ${res.status}`);
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new TyphoonError('failed', 'malformed response');
    }

    onProgress?.({ phase: 'recognizing', percent: 100, messageKey: 'recognizing' });
    // Cloud VLM returns no per-character confidence.
    return { text: parseTyphoonText(payload), confidence: null };
  }

  async terminate(): Promise<void> {
    // Stateless — no worker/socket to dispose.
  }
}

export function createTyphoonClient(): TyphoonClient {
  return new TyphoonClient();
}
