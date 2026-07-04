import type { Worker as TesseractWorker, LoggerMessage } from 'tesseract.js';
import {
  buildOcrAssetPaths,
  mapTesseractProgress,
  resolveLangString,
  type OcrLanguage,
  type OcrProgressInfo,
} from '@/utils/ocr';
import { prepareForOcr } from './imagePrep';

export type ProgressCallback = (info: OcrProgressInfo) => void;

export interface RecognizeResult {
  text: string;
  confidence: number;
}

/**
 * Thin wrapper around tesseract.js. `createWorker` is called on the MAIN thread — it spawns
 * tesseract's own dedicated Web Worker, so recognition is already off the main thread; we do NOT
 * nest a second app worker (see ADR-0004). The library is loaded via a dynamic import so the ~big
 * bundle is code-split out of the initial app load.
 *
 * One instance owns at most one worker. A language change disposes and recreates it. `terminate`
 * is idempotent; after it, the instance is spent (the hook creates a fresh instance).
 */
export class TesseractClient {
  private worker: TesseractWorker | null = null;
  private lang: OcrLanguage | null = null;
  private progressCb: ProgressCallback | null = null;
  private terminated = false;

  async recognize(
    image: Blob,
    lang: OcrLanguage,
    onProgress?: ProgressCallback,
  ): Promise<RecognizeResult> {
    if (this.terminated) throw new Error('OCR client already terminated');
    this.progressCb = onProgress ?? null;
    const prepared = await prepareForOcr(image);
    const worker = await this.ensureWorker(lang);
    const { data } = await worker.recognize(prepared);
    return { text: data.text, confidence: data.confidence };
  }

  private async ensureWorker(lang: OcrLanguage): Promise<TesseractWorker> {
    if (this.worker && this.lang === lang) return this.worker;
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.lang = null;
    }

    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const paths = buildOcrAssetPaths();
    const worker = await createWorker(resolveLangString(lang), OEM.LSTM_ONLY, {
      workerPath: paths.workerPath,
      corePath: paths.corePath,
      langPath: paths.langPath,
      // Stable IndexedDB cache key so airplane-mode reloads reuse the model (pre-Phase-5 SW).
      cachePath: 'tesseract',
      logger: (message: LoggerMessage) => {
        this.progressCb?.(mapTesseractProgress(message));
      },
    });

    // Tuning for document photos (measured on real Thai pages): AUTO page segmentation handles
    // multi-region/decorated pages far better than tesseract.js's default single-block, cutting the
    // garbage that headers/borders otherwise produce; keep phrase spaces (Thai has no intra-word
    // spaces but spaces between clauses) and declare the DPI our prep targets.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });

    this.worker = worker;
    this.lang = lang;
    return worker;
  }

  async terminate(): Promise<void> {
    if (this.terminated) return;
    this.terminated = true;
    const worker = this.worker;
    this.worker = null;
    this.lang = null;
    this.progressCb = null;
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // best-effort disposal
      }
    }
  }
}

export function createTesseractClient(): TesseractClient {
  return new TesseractClient();
}
