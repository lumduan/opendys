import { asrFilename, parseAsrText } from '@/utils/asr';

/** Failure modes surfaced to the UI. The browser only ever talks to the same-origin nginx/vite proxy,
 *  which injects the API key — so `notConfigured` (503) means the server has no key, and `auth`
 *  (401/403) means the configured key was rejected. Mirrors `TyphoonError` from the OCR client. */
export type TyphoonAsrErrorKind = 'notConfigured' | 'auth' | 'rateLimit' | 'failed';

export class TyphoonAsrError extends Error {
  constructor(readonly kind: TyphoonAsrErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'TyphoonAsrError';
  }
}

/** Same-origin proxy (nginx / vite dev). The API key is injected server-side — never in this bundle. */
const ENDPOINT = '/api/typhoon-asr';
const MODEL = 'typhoon-asr-realtime';

export interface AsrTranscript {
  text: string;
}

/**
 * Opt-in cloud ASR via OpenTyphoon's OpenAI-compatible batch transcription endpoint. Stateless: each
 * call POSTs one audio window (multipart `file` + `model`) to the same-origin proxy and parses the
 * `{ text }` response. Shaped like {@link TyphoonClient} for consistency.
 */
export class TyphoonAsrClient {
  async transcribe(audio: Blob, signal?: AbortSignal): Promise<AsrTranscript> {
    const form = new FormData();
    form.append('file', audio, asrFilename(audio.type));
    form.append('model', MODEL);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, { method: 'POST', body: form, signal });
    } catch (err) {
      // Propagate deliberate cancellation so the hook can ignore it; everything else is a failure.
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new TyphoonAsrError('failed', 'network error');
    }

    if (!res.ok) {
      if (res.status === 503) throw new TyphoonAsrError('notConfigured');
      if (res.status === 401 || res.status === 403) throw new TyphoonAsrError('auth');
      if (res.status === 429) throw new TyphoonAsrError('rateLimit');
      throw new TyphoonAsrError('failed', `HTTP ${res.status}`);
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new TyphoonAsrError('failed', 'malformed response');
    }
    return { text: parseAsrText(payload) };
  }

  async terminate(): Promise<void> {
    // Stateless — no worker/socket to dispose (parity with TyphoonClient).
  }
}

export function createTyphoonAsrClient(): TyphoonAsrClient {
  return new TyphoonAsrClient();
}
