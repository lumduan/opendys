import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { splitSpeechChunks, type SpeechLang } from '@/utils/reader';
import {
  concatFloat32,
  encodeWav,
  evaluate,
  joinWindows,
  summarize,
  tokenizeTarget,
  WAV_MIME,
  type AsrEvaluation,
  type AsrSession,
  type TargetToken,
} from '@/utils/asr';
import {
  createTyphoonAsrClient,
  TyphoonAsrError,
  type TyphoonAsrClient,
} from '@/services/asr/typhoonAsrClient';

export type AsrStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error';

export type AsrErrorKey =
  | 'unsupported'
  | 'micDenied'
  | 'micUnavailable'
  | 'cloudNotConfigured'
  | 'cloudAuth'
  | 'cloudRateLimit'
  | 'cloudFailed';

export interface UseAsrResult {
  /** Web Audio (AudioContext + AudioWorklet) + getUserMedia present in this browser. */
  supported: boolean;
  /** The same-origin proxy reports a configured Typhoon key (`/api/ocr-capabilities` → `asr`). */
  typhoonAsrAvailable: boolean;
  status: AsrStatus;
  error: AsrErrorKey | null;
  /** The growing transcript across capture windows. */
  hypothesis: string;
  /** The latest per-token assessment, or null before the first window / after reset. */
  evaluation: AsrEvaluation | null;
  start: (target: string, lang: SpeechLang) => Promise<void>;
  /** Stop capture and return the finalized session for the caller to persist (null if nothing read). */
  stop: () => AsrSession | null;
  reset: () => void;
}

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** Length of each capture window. ~4 s keeps requests well under Typhoon's 100 req/min while bounding
 *  perceived lag to one window + round-trip. */
const WINDOW_MS = 4000;
const WORKLET_URL = '/asr-recorder.worklet.js';
const WORKLET_NAME = 'asr-recorder';

function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithWebkitAudio;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Map a Typhoon ASR failure to a localized error key; anything unexpected is a generic cloud failure. */
function asrErrorKey(err: unknown): AsrErrorKey {
  if (err instanceof TyphoonAsrError) {
    if (err.kind === 'notConfigured') return 'cloudNotConfigured';
    if (err.kind === 'auth') return 'cloudAuth';
    if (err.kind === 'rateLimit') return 'cloudRateLimit';
  }
  return 'cloudFailed';
}

/**
 * Drive a real-time reading-assessment session. Mirrors `useOcr`/`useSpeech`: a monotonic `jobId`
 * guards against superseded work, the Typhoon client is created lazily (StrictMode-safe), and capture
 * is torn down on unmount.
 *
 * Because the hosted Typhoon ASR API is batch-only AND rejects `audio/webm` (Chrome's MediaRecorder
 * default — verified 415), capture uses the Web Audio graph: an AudioWorklet streams mono PCM to the
 * main thread, which every ~4 s encodes the buffered samples as a WAV window (accepted on every
 * browser) and POSTs it. Each window's transcript is appended and the whole hypothesis is re-`evaluate`d
 * against the target with a monotonic reading frontier.
 */
export function useAsr(): UseAsrResult {
  const supported = useMemo(
    () =>
      typeof AudioWorkletNode !== 'undefined' &&
      resolveAudioContextCtor() !== null &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia,
    [],
  );

  const [typhoonAsrAvailable, setTyphoonAsrAvailable] = useState(false);
  const [status, setStatus] = useState<AsrStatus>('idle');
  const [error, setError] = useState<AsrErrorKey | null>(null);
  const [hypothesis, setHypothesis] = useState('');
  const [evaluation, setEvaluation] = useState<AsrEvaluation | null>(null);

  const jobIdRef = useRef(0);
  const clientRef = useRef<TyphoonAsrClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const windowTimerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const pcmRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(48000);
  const tokensRef = useRef<TargetToken[]>([]);
  const windowsRef = useRef<string[]>([]);
  const frontierRef = useRef(0);
  const langRef = useRef<SpeechLang>('en');
  const targetRef = useRef('');

  const getClient = useCallback((): TyphoonAsrClient => {
    if (!clientRef.current) clientRef.current = createTyphoonAsrClient();
    return clientRef.current;
  }, []);

  const cleanupCapture = useCallback(() => {
    if (windowTimerRef.current !== null) {
      window.clearInterval(windowTimerRef.current);
      windowTimerRef.current = null;
    }
    try {
      sourceRef.current?.disconnect();
      workletRef.current?.disconnect();
    } catch {
      /* nodes already torn down */
    }
    sourceRef.current = null;
    workletRef.current = null;
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pcmRef.current = [];
  }, []);

  // One-shot capability probe (copy of useOcr): does the server have a Typhoon key? A 404 (pure static
  // host) or error leaves ASR unavailable, so the Practice button never appears.
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/ocr-capabilities')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (cancelled || !json || typeof json !== 'object') return;
        const flag = (json as { asr?: unknown }).asr;
        if (typeof flag === 'boolean') setTyphoonAsrAvailable(flag);
      })
      .catch(() => {
        /* no proxy → ASR stays unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tear down capture + client on unmount only (lazy creation ⇒ StrictMode fake-unmount is a no-op).
  useEffect(() => {
    return () => {
      runningRef.current = false;
      cleanupCapture();
      void clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, [cleanupCapture]);

  const start = useCallback(
    async (target: string, lang: SpeechLang) => {
      if (!supported) {
        setStatus('error');
        setError('unsupported');
        return;
      }

      const jobId = ++jobIdRef.current;
      cleanupCapture();
      runningRef.current = false;
      tokensRef.current = tokenizeTarget(splitSpeechChunks(target));
      windowsRef.current = [];
      frontierRef.current = 0;
      pcmRef.current = [];
      targetRef.current = target;
      langRef.current = lang;
      setError(null);
      setHypothesis('');
      setEvaluation(null);
      setStatus('requesting');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        if (jobId !== jobIdRef.current) return;
        setStatus('error');
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError' ? 'micDenied' : 'micUnavailable',
        );
        return;
      }
      if (jobId !== jobIdRef.current) {
        stream.getTracks().forEach((track) => track.stop()); // superseded while awaiting permission
        return;
      }
      streamRef.current = stream;

      // Transcribe one completed WAV window and fold it into the running assessment. Skips windows
      // produced during teardown (runningRef false) so stop/reset/error never fire late state updates.
      const transcribeWindow = async (blob: Blob): Promise<void> => {
        if (!runningRef.current || jobId !== jobIdRef.current || blob.size === 0) return;
        try {
          const { text } = await getClient().transcribe(blob);
          if (jobId !== jobIdRef.current || text.trim() === '') return;
          windowsRef.current.push(text);
          const hyp = joinWindows(windowsRef.current);
          const result = evaluate(tokensRef.current, hyp, frontierRef.current);
          frontierRef.current = result.frontier;
          setHypothesis(hyp);
          setEvaluation(result);
        } catch (err) {
          if (jobId !== jobIdRef.current) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          runningRef.current = false;
          cleanupCapture();
          setError(asrErrorKey(err));
          setStatus('error');
        }
      };

      try {
        const Ctor = resolveAudioContextCtor();
        if (!Ctor) throw new Error('no AudioContext');
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        sampleRateRef.current = ctx.sampleRate;
        await ctx.audioWorklet.addModule(WORKLET_URL);
        if (jobId !== jobIdRef.current) {
          void ctx.close();
          return;
        }
        const source = ctx.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(ctx, WORKLET_NAME);
        node.port.onmessage = (event: MessageEvent) => {
          if (jobId === jobIdRef.current && runningRef.current && event.data) {
            pcmRef.current.push(event.data as Float32Array);
          }
        };
        source.connect(node);
        node.connect(ctx.destination); // pulls the graph; the worklet outputs silence (no mic feedback)
        sourceRef.current = source;
        workletRef.current = node;
        runningRef.current = true;
        setStatus('recording');

        // Every window, encode the buffered PCM as WAV and POST it.
        windowTimerRef.current = window.setInterval(() => {
          if (jobId !== jobIdRef.current || !runningRef.current) return;
          const frames = pcmRef.current;
          pcmRef.current = [];
          if (frames.length === 0) return;
          const wav = encodeWav(concatFloat32(frames), sampleRateRef.current);
          void transcribeWindow(new Blob([wav], { type: WAV_MIME }));
        }, WINDOW_MS);
      } catch {
        if (jobId !== jobIdRef.current) return;
        runningRef.current = false;
        cleanupCapture();
        setStatus('error');
        setError('micUnavailable');
      }
    },
    [supported, cleanupCapture, getClient],
  );

  const stop = useCallback((): AsrSession | null => {
    runningRef.current = false;
    setStatus('processing');
    cleanupCapture();

    const hyp = joinWindows(windowsRef.current);
    const finalEval = evaluate(tokensRef.current, hyp, tokensRef.current.length);
    setHypothesis(hyp);
    setEvaluation(finalEval);
    setStatus('done');

    if (tokensRef.current.length === 0) return null;
    return summarize(finalEval, {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      lang: langRef.current,
      target: targetRef.current,
    });
  }, [cleanupCapture]);

  const reset = useCallback(() => {
    jobIdRef.current += 1;
    runningRef.current = false;
    cleanupCapture();
    windowsRef.current = [];
    frontierRef.current = 0;
    tokensRef.current = [];
    setStatus('idle');
    setError(null);
    setHypothesis('');
    setEvaluation(null);
  }, [cleanupCapture]);

  return { supported, typhoonAsrAvailable, status, error, hypothesis, evaluation, start, stop, reset };
}
