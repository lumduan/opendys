import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTesseractClient, type TesseractClient } from '@/services/ocr/tesseractClient';
import {
  buildOcrAssetPaths,
  computeOcrSupport,
  isAcceptedImageFile,
  requiredModelFiles,
  type OcrLanguage,
  type OcrProgressInfo,
} from '@/utils/ocr';

export type OcrStatus = 'idle' | 'preparing' | 'recognizing' | 'done' | 'error';

export type OcrErrorKey = 'unsupported' | 'invalidFile' | 'modelMissing' | 'recognizeFailed';

export interface UseOcrResult {
  status: OcrStatus;
  progress: OcrProgressInfo | null;
  text: string | null;
  confidence: number | null;
  error: OcrErrorKey | null;
  isSupported: boolean;
  recognize: (file: File | Blob, lang: OcrLanguage) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

/**
 * Drive an OCR job with a small state machine. The tesseract client is created **lazily on the
 * first `recognize`** (never in a mount effect), which makes it React 19 StrictMode-safe: the
 * fake mount→unmount→mount has no worker to leak. A monotonic `jobId` guards against a
 * superseded/cancelled job overwriting state; progress updates are throttled to integer-percent.
 */
export function useOcr(): UseOcrResult {
  const [status, setStatus] = useState<OcrStatus>('idle');
  const [progress, setProgress] = useState<OcrProgressInfo | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<OcrErrorKey | null>(null);

  const clientRef = useRef<TesseractClient | null>(null);
  const jobIdRef = useRef(0);
  const lastProgressKeyRef = useRef('');

  const isSupported = useMemo(
    () =>
      computeOcrSupport({
        hasWasm: typeof WebAssembly !== 'undefined',
        hasWorker: typeof Worker !== 'undefined',
      }),
    [],
  );

  // Dispose the worker on unmount only. Lazy creation means the StrictMode fake-unmount is a no-op.
  useEffect(() => {
    return () => {
      void clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, []);

  const getClient = useCallback((): TesseractClient => {
    if (!clientRef.current) clientRef.current = createTesseractClient();
    return clientRef.current;
  }, []);

  const handleProgress = useCallback((info: OcrProgressInfo) => {
    const key = `${info.phase}:${info.percent}`;
    if (key === lastProgressKeyRef.current) return;
    lastProgressKeyRef.current = key;
    setProgress(info);
    setStatus(info.phase);
  }, []);

  const preflightModels = useCallback(async (lang: OcrLanguage): Promise<boolean> => {
    const { langPath } = buildOcrAssetPaths();
    try {
      const results = await Promise.all(
        requiredModelFiles(lang).map((file) =>
          fetch(`${langPath}/${file}`, { method: 'HEAD' }).then((res) => res.ok),
        ),
      );
      return results.every(Boolean);
    } catch {
      return false;
    }
  }, []);

  const recognize = useCallback(
    async (file: File | Blob, lang: OcrLanguage) => {
      if (!isSupported) {
        setStatus('error');
        setError('unsupported');
        return;
      }
      if (file instanceof File && !isAcceptedImageFile(file)) {
        setStatus('error');
        setError('invalidFile');
        return;
      }

      const jobId = ++jobIdRef.current;
      setError(null);
      setText(null);
      setConfidence(null);
      lastProgressKeyRef.current = '';
      setStatus('preparing');
      setProgress({ phase: 'preparing', percent: 0, messageKey: 'initializing' });

      const modelsOk = await preflightModels(lang);
      if (jobId !== jobIdRef.current) return;
      if (!modelsOk) {
        setStatus('error');
        setError('modelMissing');
        return;
      }

      try {
        const result = await getClient().recognize(file, lang, (info) => {
          if (jobId === jobIdRef.current) handleProgress(info);
        });
        if (jobId !== jobIdRef.current) return;
        // Canonicalize (NFC) so any mis-ordered Thai combining marks from OCR normalize before display.
        setText(result.text.normalize('NFC'));
        setConfidence(result.confidence);
        setProgress(null);
        setStatus('done');
      } catch {
        if (jobId !== jobIdRef.current) return; // terminate() during recognize surfaces as reject
        setStatus('error');
        setError('recognizeFailed');
      }
    },
    [getClient, handleProgress, isSupported, preflightModels],
  );

  const cancel = useCallback(() => {
    jobIdRef.current += 1; // supersede any in-flight job
    void clientRef.current?.terminate();
    clientRef.current = null;
    setStatus('idle');
    setProgress(null);
  }, []);

  const reset = useCallback(() => {
    jobIdRef.current += 1;
    setStatus('idle');
    setProgress(null);
    setText(null);
    setConfidence(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    text,
    confidence,
    error,
    isSupported,
    recognize,
    cancel,
    reset,
  };
}
