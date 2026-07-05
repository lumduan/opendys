import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { splitSpeechChunks, type SpeechLang } from '@/utils/reader';
import {
  concatFloat32,
  encodeWav,
  evaluate,
  guidedEvaluate,
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

/** `free` = grade the whole passage continuously; `guided` = advance one word at a time (karaoke). */
export type AsrMode = 'free' | 'guided';

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
  /** The mode of the active/last session. */
  mode: AsrMode;
  error: AsrErrorKey | null;
  /** The growing transcript across capture windows. */
  hypothesis: string;
  /** The latest assessment. In guided mode `frontier` is the current word cursor. */
  evaluation: AsrEvaluation | null;
  /** Set when a session finishes (manual stop OR guided auto-finish) so the caller can persist it. */
  session: AsrSession | null;
  start: (target: string, lang: SpeechLang, mode?: AsrMode) => Promise<void>;
  /** Stop capture and return the finalized session (null if nothing read). */
  stop: () => AsrSession | null;
  /** Guided mode only: skip the current word (marks it red) and advance the cursor. */
  skip: () => void;
  reset: () => void;
}

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** Free-mode fixed capture window. ~4 s keeps requests well under Typhoon's 100 req/min. */
const WINDOW_MS = 4000;
/** Guided mode uses pause detection instead of a fixed window: flush an utterance after this much
 *  trailing silence, or once it reaches the hard cap. RMS above the threshold counts as speech. */
const GUIDED_SILENCE_MS = 600;
const GUIDED_MAX_UTTER_MS = 6000;
const SPEECH_RMS_THRESHOLD = 0.012;
const WORKLET_URL = '/asr-recorder.worklet.js';
const WORKLET_NAME = 'asr-recorder';

function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithWebkitAudio;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Root-mean-square level of a PCM frame (cheap voice-activity signal). */
function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
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
 * is torn down on unmount. Capture uses a self-hosted AudioWorklet → WAV window POST (batch Typhoon).
 *
 * Two modes: **free** (fixed ~4 s windows, whole-passage grading) and **guided** (word-by-word — flush
 * on the reader's natural pauses, advance a single cursor through only leading correctly-read words).
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
  const [mode, setMode] = useState<AsrMode>('free');
  const [error, setError] = useState<AsrErrorKey | null>(null);
  const [hypothesis, setHypothesis] = useState('');
  const [evaluation, setEvaluation] = useState<AsrEvaluation | null>(null);
  const [session, setSession] = useState<AsrSession | null>(null);

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
  const modeRef = useRef<AsrMode>('free');
  const skippedRef = useRef<Set<number>>(new Set());
  const hasSpeechRef = useRef(false);
  const silenceMsRef = useRef(0);
  const utterMsRef = useRef(0);

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

  // Finish a guided session (reader reached the last word, or skipped to the end): stop capture, grade,
  // and expose the session for the caller to persist.
  const finalizeGuided = useCallback(() => {
    runningRef.current = false;
    cleanupCapture();
    const hyp = joinWindows(windowsRef.current);
    const finalEval = guidedEvaluate(tokensRef.current, hyp, tokensRef.current.length, {}, skippedRef.current);
    frontierRef.current = finalEval.frontier;
    setEvaluation(finalEval);
    setStatus('done');
    if (tokensRef.current.length > 0) {
      setSession(
        summarize(finalEval, {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          lang: langRef.current,
          target: targetRef.current,
        }),
      );
    }
  }, [cleanupCapture]);

  const start = useCallback(
    async (target: string, lang: SpeechLang, startMode: AsrMode = 'free') => {
      if (!supported) {
        setStatus('error');
        setError('unsupported');
        return;
      }

      const jobId = ++jobIdRef.current;
      cleanupCapture();
      runningRef.current = false;
      modeRef.current = startMode;
      skippedRef.current = new Set();
      hasSpeechRef.current = false;
      silenceMsRef.current = 0;
      utterMsRef.current = 0;
      tokensRef.current = tokenizeTarget(splitSpeechChunks(target));
      windowsRef.current = [];
      frontierRef.current = 0;
      pcmRef.current = [];
      targetRef.current = target;
      langRef.current = lang;
      setMode(startMode);
      setSession(null);
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
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      // Transcribe one completed window and fold it into the running assessment. Skips windows produced
      // during teardown (runningRef false) so stop/reset/error never fire late state updates.
      const transcribeWindow = async (blob: Blob): Promise<void> => {
        if (!runningRef.current || jobId !== jobIdRef.current || blob.size === 0) return;
        try {
          const { text } = await getClient().transcribe(blob);
          if (jobId !== jobIdRef.current || text.trim() === '') return;
          windowsRef.current.push(text);
          const hyp = joinWindows(windowsRef.current);
          const result =
            modeRef.current === 'guided'
              ? guidedEvaluate(tokensRef.current, hyp, frontierRef.current, {}, skippedRef.current)
              : evaluate(tokensRef.current, hyp, frontierRef.current);
          frontierRef.current = result.frontier;
          setHypothesis(hyp);
          setEvaluation(result);
          if (
            modeRef.current === 'guided' &&
            tokensRef.current.length > 0 &&
            result.frontier >= tokensRef.current.length
          ) {
            finalizeGuided();
          }
        } catch (err) {
          if (jobId !== jobIdRef.current) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          runningRef.current = false;
          cleanupCapture();
          setError(asrErrorKey(err));
          setStatus('error');
        }
      };

      // Encode the buffered PCM as a WAV window and POST it; reset the utterance accumulators.
      const flushWindow = (): void => {
        const frames = pcmRef.current;
        pcmRef.current = [];
        hasSpeechRef.current = false;
        silenceMsRef.current = 0;
        utterMsRef.current = 0;
        if (frames.length === 0) return;
        const wav = encodeWav(concatFloat32(frames), sampleRateRef.current);
        void transcribeWindow(new Blob([wav], { type: WAV_MIME }));
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
          if (jobId !== jobIdRef.current || !runningRef.current || !event.data) return;
          const frame = event.data as Float32Array;
          if (modeRef.current === 'guided') {
            // Voice-activity gate: accumulate a spoken word, flush it on a short pause (or the cap).
            const frameMs = (frame.length / sampleRateRef.current) * 1000;
            if (rms(frame) > SPEECH_RMS_THRESHOLD) {
              hasSpeechRef.current = true;
              silenceMsRef.current = 0;
            } else if (hasSpeechRef.current) {
              silenceMsRef.current += frameMs;
            }
            if (hasSpeechRef.current) {
              pcmRef.current.push(frame);
              utterMsRef.current += frameMs;
              if (silenceMsRef.current >= GUIDED_SILENCE_MS || utterMsRef.current >= GUIDED_MAX_UTTER_MS) {
                flushWindow();
              }
            }
          } else {
            pcmRef.current.push(frame);
          }
        };
        source.connect(node);
        node.connect(ctx.destination); // pulls the graph; the worklet outputs silence (no mic feedback)
        sourceRef.current = source;
        workletRef.current = node;
        runningRef.current = true;
        setStatus('recording');

        // Free mode flushes on a fixed timer; guided mode flushes on pauses (in the worklet handler).
        if (startMode === 'free') {
          windowTimerRef.current = window.setInterval(() => {
            if (jobId !== jobIdRef.current || !runningRef.current) return;
            flushWindow();
          }, WINDOW_MS);
        }
      } catch {
        if (jobId !== jobIdRef.current) return;
        runningRef.current = false;
        cleanupCapture();
        setStatus('error');
        setError('micUnavailable');
      }
    },
    [supported, cleanupCapture, getClient, finalizeGuided],
  );

  const stop = useCallback((): AsrSession | null => {
    runningRef.current = false;
    setStatus('processing');
    cleanupCapture();

    const hyp = joinWindows(windowsRef.current);
    const finalEval =
      modeRef.current === 'guided'
        ? guidedEvaluate(tokensRef.current, hyp, frontierRef.current, {}, skippedRef.current)
        : evaluate(tokensRef.current, hyp, tokensRef.current.length);
    setHypothesis(hyp);
    setEvaluation(finalEval);
    setStatus('done');

    if (tokensRef.current.length === 0) return null;
    const finished = summarize(finalEval, {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      lang: langRef.current,
      target: targetRef.current,
    });
    setSession(finished);
    return finished;
  }, [cleanupCapture]);

  const skip = useCallback(() => {
    if (modeRef.current !== 'guided' || !runningRef.current) return;
    const cursor = frontierRef.current;
    if (cursor >= tokensRef.current.length) return;
    skippedRef.current.add(cursor);
    const hyp = joinWindows(windowsRef.current);
    const result = guidedEvaluate(tokensRef.current, hyp, cursor, {}, skippedRef.current);
    frontierRef.current = result.frontier;
    setEvaluation(result);
    if (tokensRef.current.length > 0 && result.frontier >= tokensRef.current.length) {
      finalizeGuided();
    }
  }, [finalizeGuided]);

  const reset = useCallback(() => {
    jobIdRef.current += 1;
    runningRef.current = false;
    cleanupCapture();
    modeRef.current = 'free';
    skippedRef.current = new Set();
    hasSpeechRef.current = false;
    silenceMsRef.current = 0;
    utterMsRef.current = 0;
    windowsRef.current = [];
    frontierRef.current = 0;
    tokensRef.current = [];
    setMode('free');
    setSession(null);
    setStatus('idle');
    setError(null);
    setHypothesis('');
    setEvaluation(null);
  }, [cleanupCapture]);

  return {
    supported,
    typhoonAsrAvailable,
    status,
    mode,
    error,
    hypothesis,
    evaluation,
    session,
    start,
    stop,
    skip,
    reset,
  };
}
