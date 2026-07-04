import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTesseractClient,
  type TesseractClient,
  type OcrEngineKind,
} from '@/services/ocr/tesseractClient';
import { createTyphoonClient, TyphoonError, type TyphoonClient } from '@/services/ocr/typhoonClient';
import {
  buildOcrAssetPaths,
  computeOcrSupport,
  isAcceptedImageFile,
  requiredModelFiles,
  type OcrLanguage,
  type OcrProgressInfo,
} from '@/utils/ocr';

export type OcrStatus = 'idle' | 'preparing' | 'recognizing' | 'done' | 'error';

export type OcrErrorKey =
  | 'unsupported'
  | 'invalidFile'
  | 'modelMissing'
  | 'recognizeFailed'
  | 'cloudNotConfigured'
  | 'cloudAuth'
  | 'cloudRateLimit'
  | 'cloudFailed';

export interface UseOcrResult {
  status: OcrStatus;
  progress: OcrProgressInfo | null;
  text: string | null;
  confidence: number | null;
  error: OcrErrorKey | null;
  isSupported: boolean;
  /** True once the same-origin proxy reports a configured Typhoon key (`/api/ocr-capabilities`). */
  typhoonAvailable: boolean;
  recognize: (file: File | Blob, lang: OcrLanguage, engine?: OcrEngineKind) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

/** Map a Typhoon failure to the localized error key; anything unexpected is a generic cloud failure. */
function cloudErrorKey(err: unknown): OcrErrorKey {
  if (err instanceof TyphoonError) {
    if (err.kind === 'notConfigured') return 'cloudNotConfigured';
    if (err.kind === 'auth') return 'cloudAuth';
    if (err.kind === 'rateLimit') return 'cloudRateLimit';
  }
  return 'cloudFailed';
}

/**
 * Drive an OCR job with a small state machine. The tesseract client is created **lazily on the
 * first `recognize`** (never in a mount effect), which makes it React 19 StrictMode-safe: the
 * fake mount→unmount→mount has no worker to leak. A monotonic `jobId` guards against a
 * superseded/cancelled job overwriting state; progress updates are throttled to integer-percent.
 * The opt-in Typhoon cloud engine is stateless and skips the local model preflight.
 */
export function useOcr(): UseOcrResult {
  const [status, setStatus] = useState<OcrStatus>('idle');
  const [progress, setProgress] = useState<OcrProgressInfo | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<OcrErrorKey | null>(null);
  const [typhoonAvailable, setTyphoonAvailable] = useState(false);

  const clientRef = useRef<TesseractClient | null>(null);
  const typhoonRef = useRef<TyphoonClient | null>(null);
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

  // One-shot capability probe: has the server configured a Typhoon key? A 404 (no proxy, e.g. a pure
  // static host) or any error leaves cloud unavailable, so the toggle simply never appears.
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/ocr-capabilities')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (cancelled || !json || typeof json !== 'object') return;
        const flag = (json as { typhoon?: unknown }).typhoon;
        if (typeof flag === 'boolean') setTyphoonAvailable(flag);
      })
      .catch(() => {
        /* no proxy → cloud stays unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dispose engines on unmount only. Lazy creation means the StrictMode fake-unmount is a no-op.
  useEffect(() => {
    return () => {
      void clientRef.current?.terminate();
      void typhoonRef.current?.terminate();
      clientRef.current = null;
      typhoonRef.current = null;
    };
  }, []);

  const getClient = useCallback((): TesseractClient => {
    if (!clientRef.current) clientRef.current = createTesseractClient();
    return clientRef.current;
  }, []);

  const getTyphoonClient = useCallback((): TyphoonClient => {
    if (!typhoonRef.current) typhoonRef.current = createTyphoonClient();
    return typhoonRef.current;
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
    async (file: File | Blob, lang: OcrLanguage, engine: OcrEngineKind = 'tesseract') => {
      // WASM/Worker are only needed on-device; the cloud path just needs fetch + canvas.
      if (engine === 'tesseract' && !isSupported) {
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

      if (engine === 'tesseract') {
        const modelsOk = await preflightModels(lang);
        if (jobId !== jobIdRef.current) return;
        if (!modelsOk) {
          setStatus('error');
          setError('modelMissing');
          return;
        }
      }

      try {
        const client = engine === 'typhoon' ? getTyphoonClient() : getClient();
        const result = await client.recognize(file, lang, (info) => {
          if (jobId === jobIdRef.current) handleProgress(info);
        });
        if (jobId !== jobIdRef.current) return;
        // Canonicalize (NFC) so any mis-ordered Thai combining marks normalize before display.
        setText(result.text.normalize('NFC'));
        setConfidence(result.confidence);
        setProgress(null);
        setStatus('done');
      } catch (err) {
        if (jobId !== jobIdRef.current) return; // terminate()/cancel during a job surfaces as reject
        setStatus('error');
        setError(engine === 'typhoon' ? cloudErrorKey(err) : 'recognizeFailed');
      }
    },
    [getClient, getTyphoonClient, handleProgress, isSupported, preflightModels],
  );

  const cancel = useCallback(() => {
    jobIdRef.current += 1; // supersede any in-flight job (cloud fetch result is then discarded)
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
    typhoonAvailable,
    recognize,
    cancel,
    reset,
  };
}
