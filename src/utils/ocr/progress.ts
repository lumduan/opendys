export type OcrPhase = 'preparing' | 'recognizing';

export type OcrProgressMessageKey =
  | 'initializing'
  | 'loadingLanguage'
  | 'initializingApi'
  | 'recognizing';

export interface OcrProgressInfo {
  phase: OcrPhase;
  /** Integer 0..100. */
  percent: number;
  messageKey: OcrProgressMessageKey;
}

// tesseract.js v7 logger status strings (src/worker-script/index.js).
const STATUS_MAP: Record<string, { phase: OcrPhase; messageKey: OcrProgressMessageKey }> = {
  'initializing tesseract': { phase: 'preparing', messageKey: 'initializing' },
  'loading language traineddata': { phase: 'preparing', messageKey: 'loadingLanguage' },
  'initializing api': { phase: 'preparing', messageKey: 'initializingApi' },
  'recognizing text': { phase: 'recognizing', messageKey: 'recognizing' },
};

/**
 * Map a tesseract logger event to a stable, localizable progress model. Returns a message KEY
 * (the component localizes via i18n). Deliberately tolerant: any unrecognized status is treated
 * as `preparing`, and `progress` is clamped to an integer 0..100 — the exact status set varies
 * by tesseract version, so a hard exhaustive switch would be both a UX and a coverage hazard.
 */
export function mapTesseractProgress(input: { status?: string; progress?: number }): OcrProgressInfo {
  const mapped = STATUS_MAP[input.status ?? ''] ?? {
    phase: 'preparing' as const,
    messageKey: 'initializing' as const,
  };
  const raw = typeof input.progress === 'number' && Number.isFinite(input.progress) ? input.progress : 0;
  const percent = Math.max(0, Math.min(100, Math.round(raw * 100)));
  return { phase: mapped.phase, percent, messageKey: mapped.messageKey };
}
