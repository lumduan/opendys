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

/** `free` = grade the whole passage continuously; `line` = grade one clicked line at a time. */
export type AsrMode = 'free' | 'line';

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
  /** The latest assessment. */
  evaluation: AsrEvaluation | null;
  /** Set when a session finishes (manual stop) so the caller can persist it. */
  session: AsrSession | null;
  /** Live microphone level in [0,1] while recording (0 when idle). Drives the voice gauge. */
  micLevel: number;
  start: (
    target: string,
    lang: SpeechLang,
    mode?: AsrMode,
    lineChunkIndex?: number,
    lineSilenceMs?: number,
  ) => Promise<void>;
  /** Stop capture and return the finalized session (null if nothing read). */
  stop: () => Promise<AsrSession | null>;
  reset: () => void;
}

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** Free-mode fixed capture window. ~4 s keeps requests well under Typhoon's 100 req/min. */
const WINDOW_MS = 4000;
const WORKLET_URL = '/asr-recorder.worklet.js';
const WORKLET_NAME = 'asr-recorder';
/** Voice-activity threshold (RMS). Frames above this count as "speaking" — drives the line-mode silence
 *  auto-stop and the mic-level gauge. */
const SPEECH_RMS_THRESHOLD = 0.012;
/** Line mode: stop + analyze after this much trailing silence once the reader has spoken (default). */
const LINE_DEFAULT_SILENCE_MS = 5000;
/** Line mode: hard cap so a never-quiet / never-reads session can't record forever. */
const LINE_MAX_MS = 60000;
/** Mic-level UI pushes are throttled to ~12 fps (the worklet posts a frame every ~2.7 ms). */
const LEVEL_PUSH_INTERVAL_MS = 80;
/** Scale raw RMS into a 0–1 gauge value (speech RMS is typically 0.02–0.2). */
const LEVEL_SCALE = 6;

function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithWebkitAudio;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Root-mean-square level of a PCM frame (cheap voice-activity / mic-level signal). */
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
 * is torn down on unmount. Capture uses a self-hosted AudioWorklet → WAV POST.
 *
 * Two modes: **free** (fixed ~4 s windows, whole-passage grading) and **line** (one clicked line at a
 * time — the whole line is captured, then a single on-demand transcription runs on stop, so feedback
 * is one short round-trip per line instead of a continuous per-utterance stream).
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
  const [micLevel, setMicLevel] = useState(0);

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
  /** The active job's transcribe function, so `stop()` can fire one final on-demand transcription. */
  const transcribeRef = useRef<((blob: Blob) => Promise<void>) | null>(null);
  /** In `line` mode, the real chunk index of the line being graded (for highlight localization). */
  const lineChunkIndexRef = useRef<number | null>(null);
  // Voice-activity + auto-stop state (line mode). Refs, not state, so the per-frame worklet handler
  // can update them without re-rendering on every audio quantum.
  const levelRef = useRef(0);
  const lastLevelPushRef = useRef(0);
  const hasSpeechRef = useRef(false);
  const silenceMsRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const lineSilenceMsRef = useRef(LINE_DEFAULT_SILENCE_MS);
  const autoStopFiredRef = useRef(false);
  const stoppingRef = useRef(false);
  const stopRef = useRef<(() => Promise<AsrSession | null>) | null>(null);

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
      transcribeRef.current = null;
      cleanupCapture();
      void clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, [cleanupCapture]);

  const start = useCallback(
    async (
      target: string,
      lang: SpeechLang,
      startMode: AsrMode = 'free',
      lineChunkIndex?: number,
      lineSilenceMs?: number,
    ) => {
      if (!supported) {
        setStatus('error');
        setError('unsupported');
        return;
      }

      const jobId = ++jobIdRef.current;
      cleanupCapture();
      runningRef.current = false;
      modeRef.current = startMode;
      frontierRef.current = 0;
      // Reset the voice-activity / auto-stop accumulators for this session.
      lineSilenceMsRef.current = lineSilenceMs ?? LINE_DEFAULT_SILENCE_MS;
      hasSpeechRef.current = false;
      silenceMsRef.current = 0;
      elapsedMsRef.current = 0;
      autoStopFiredRef.current = false;
      stoppingRef.current = false;
      levelRef.current = 0;
      lastLevelPushRef.current = 0;
      // Tokenize the target. In `line` mode the target is a single line; tokenizeTarget would tag its
      // tokens with chunkIndex 0, so remap them to the real clicked-line index — that keeps the
      // highlight pipeline (which paints via [data-chunk-index]) on the correct line in the surface.
      const sourceChunks =
        startMode === 'line' ? [{ raw: target, speak: target.trim() }] : splitSpeechChunks(target);
      const baseTokens = tokenizeTarget(sourceChunks);
      tokensRef.current =
        startMode === 'line' && lineChunkIndex != null
          ? baseTokens.map((tk) => ({ ...tk, chunkIndex: lineChunkIndex }))
          : baseTokens;
      lineChunkIndexRef.current = startMode === 'line' ? (lineChunkIndex ?? 0) : null;
      windowsRef.current = [];
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
      transcribeRef.current = transcribeWindow;

      // Encode the buffered PCM as a WAV window and POST it; reset the buffer.
      const flushWindow = (): void => {
        const frames = pcmRef.current;
        pcmRef.current = [];
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
          pcmRef.current.push(frame);
          // Mic level + voice activity (both modes). Throttle the UI push: the worklet posts ~one
          // quantum per message, so per-frame setState would thrash React.
          const level = rms(frame);
          levelRef.current = level;
          const now = performance.now();
          if (now - lastLevelPushRef.current > LEVEL_PUSH_INTERVAL_MS) {
            lastLevelPushRef.current = now;
            setMicLevel(Math.min(1, level * LEVEL_SCALE));
          }
          const frameMs = (frame.length / sampleRateRef.current) * 1000;
          if (level > SPEECH_RMS_THRESHOLD) {
            hasSpeechRef.current = true;
            silenceMsRef.current = 0;
          } else if (hasSpeechRef.current) {
            silenceMsRef.current += frameMs;
          }
          elapsedMsRef.current += frameMs;
          // Line mode: auto-stop once the reader trails off (after speech) past the silence threshold,
          // or at the hard cap. One shot — the stoppingRef guard in stop() absorbs a manual-Done race.
          if (
            modeRef.current === 'line' &&
            !autoStopFiredRef.current &&
            !stoppingRef.current &&
            ((hasSpeechRef.current && silenceMsRef.current >= lineSilenceMsRef.current) ||
              elapsedMsRef.current >= LINE_MAX_MS)
          ) {
            autoStopFiredRef.current = true;
            void stopRef.current?.();
          }
        };
        source.connect(node);
        node.connect(ctx.destination); // pulls the graph; the worklet outputs silence (no mic feedback)
        sourceRef.current = source;
        workletRef.current = node;
        runningRef.current = true;
        setStatus('recording');

        // Free mode flushes on a fixed timer; line mode captures the whole line and flushes on stop.
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
    [supported, cleanupCapture, getClient],
  );

  const stop = useCallback((): Promise<AsrSession | null> => {
    if (stoppingRef.current) return Promise.resolve(null); // a manual Done + an auto-stop can't both finalize
    stoppingRef.current = true;
    setStatus('processing');
    // Grab any unflushed audio BEFORE cleanup clears the buffer. In line mode nothing has been sent yet
    // (no timer), so this is the single, on-demand transcription for the whole line. runningRef stays
    // true until after that transcription so it passes transcribeWindow's guard; cleanup has already
    // stopped the mic, so no new frames arrive meanwhile.
    const frames = pcmRef.current;
    pcmRef.current = [];
    cleanupCapture();

    const finish = (): AsrSession | null => {
      runningRef.current = false;
      setMicLevel(0);
      const hyp = joinWindows(windowsRef.current);
      const finalEval = evaluate(tokensRef.current, hyp, tokensRef.current.length);
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
    };

    if (modeRef.current === 'line' && frames.length > 0 && transcribeRef.current) {
      const wav = encodeWav(concatFloat32(frames), sampleRateRef.current);
      return transcribeRef.current(new Blob([wav], { type: WAV_MIME })).then(() => finish());
    }
    return Promise.resolve(finish());
  }, [cleanupCapture]);

  // Keep a ref to the latest stop() so the per-frame worklet handler (defined inside start's closure)
  // can fire the auto-stop without capturing a stale function.
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const reset = useCallback(() => {
    jobIdRef.current += 1;
    runningRef.current = false;
    transcribeRef.current = null;
    lineChunkIndexRef.current = null;
    cleanupCapture();
    modeRef.current = 'free';
    windowsRef.current = [];
    frontierRef.current = 0;
    tokensRef.current = [];
    hasSpeechRef.current = false;
    silenceMsRef.current = 0;
    elapsedMsRef.current = 0;
    autoStopFiredRef.current = false;
    stoppingRef.current = false;
    levelRef.current = 0;
    setMode('free');
    setSession(null);
    setStatus('idle');
    setError(null);
    setHypothesis('');
    setEvaluation(null);
    setMicLevel(0);
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
    micLevel,
    start,
    stop,
    reset,
  };
}
