import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampRate,
  isOfflineVoiceAvailable,
  pickVoice,
  splitSpeechChunks,
  type SpeechLang,
} from '@/utils/reader';

/** The word currently being spoken, located by the TTS `onboundary` event. `charIndex`/`charLength`
 *  are offsets into the chunk's TRIMMED spoken string (see `wordHighlight` helpers). */
export interface ActiveWord {
  chunkIndex: number;
  charIndex: number;
  charLength: number;
}

export interface UseSpeechResult {
  supported: boolean;
  voicesReady: boolean;
  thaiVoiceAvailable: boolean;
  englishVoiceAvailable: boolean;
  speaking: boolean;
  /** Index (into the Reader's chunk list) currently being spoken, or null. */
  activeChunkIndex: number | null;
  /** The word currently being spoken (from `onboundary`), or null. Unreliable on Safari/iOS + many
   *  offline voices — consumers fall back to `activeChunkIndex` when it stays null. */
  activeWord: ActiveWord | null;
  /** Read a whole passage, one utterance per sentence-chunk (highlights each as it plays). */
  speak: (text: string, lang: SpeechLang, rate?: number) => void;
  /** Read one chunk (e.g. a tapped sentence) and highlight the given chunk index. `onEnd` (optional)
   *  fires when the chunk finishes naturally — used by line practice to chain TTS preview → record. */
  speakChunk: (text: string, lang: SpeechLang, chunkIndex: number, rate?: number, onEnd?: () => void) => void;
  stop: () => void;
}

const hasSpeech = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

interface SpeakItem {
  speak: string;
  index: number;
}

export function useSpeech(): UseSpeechResult {
  const supported = hasSpeech();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);
  const jobIdRef = useRef(0);

  // Voices are empty on the first synchronous getVoices() in Chrome → wire voiceschanged + a 1s fallback.
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    let settled = false;
    const apply = () => {
      const list = synth.getVoices();
      if (list.length) {
        settled = true;
        setVoices(list);
        setVoicesReady(true);
      }
    };
    apply();
    synth.addEventListener('voiceschanged', apply);
    synth.onvoiceschanged = apply; // Safari relies on the property
    const timer = window.setTimeout(() => {
      if (!settled) {
        setVoices(synth.getVoices());
        setVoicesReady(true);
      }
    }, 1000);
    return () => {
      synth.removeEventListener('voiceschanged', apply);
      synth.onvoiceschanged = null;
      window.clearTimeout(timer);
    };
  }, [supported]);

  // Stop speech on unmount / route change.
  useEffect(
    () => () => {
      if (hasSpeech()) window.speechSynthesis.cancel();
    },
    [],
  );

  const stop = useCallback(() => {
    jobIdRef.current += 1;
    if (hasSpeech()) window.speechSynthesis.cancel();
    // Safari does not fire onend after cancel(), so clear state directly.
    setSpeaking(false);
    setActiveChunkIndex(null);
    setActiveWord(null);
  }, []);

  const enqueue = useCallback((items: SpeakItem[], lang: SpeechLang, rate: number, onEnd?: () => void) => {
    if (!hasSpeech()) return;
    const synth = window.speechSynthesis;
    const voice = pickVoice(synth.getVoices(), lang);
    if (!voice) return; // no offline voice → caller shows degrade UI; never fall back to a network voice

    const speakable = items.filter((item) => item.speak !== '');
    if (speakable.length === 0) return;

    synth.cancel();
    const jobId = (jobIdRef.current += 1);
    setSpeaking(true);
    setActiveChunkIndex(null);
    setActiveWord(null);

    speakable.forEach((item, i) => {
      const utterance = new SpeechSynthesisUtterance(item.speak);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = clampRate(rate);
      utterance.onstart = () => {
        if (jobId === jobIdRef.current) {
          setActiveChunkIndex(item.index);
          setActiveWord(null); // clear the previous chunk's word until this chunk's first boundary
        }
      };
      // Karaoke word tracking. Fires on Chrome + many desktop voices; often silent on Safari/iOS and
      // offline Thai voices → activeWord just stays null and the sentence highlight remains (fallback).
      utterance.onboundary = (event) => {
        if (jobId === jobIdRef.current && event.name === 'word') {
          setActiveWord({
            chunkIndex: item.index,
            charIndex: event.charIndex,
            charLength: event.charLength ?? 0,
          });
        }
      };
      if (i === speakable.length - 1) {
        utterance.onend = () => {
          if (jobId === jobIdRef.current) {
            setSpeaking(false);
            setActiveChunkIndex(null);
            setActiveWord(null);
            onEnd?.(); // natural completion only — cancel()/stop() bumps jobId, so this stays silent
          }
        };
      }
      synth.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    (text: string, lang: SpeechLang, rate = 1) => {
      const items = splitSpeechChunks(text).map((chunk, index) => ({ speak: chunk.speak, index }));
      enqueue(items, lang, rate);
    },
    [enqueue],
  );

  const speakChunk = useCallback(
    (text: string, lang: SpeechLang, chunkIndex: number, rate = 1, onEnd?: () => void) => {
      enqueue([{ speak: text.trim(), index: chunkIndex }], lang, rate, onEnd);
    },
    [enqueue],
  );

  return {
    supported,
    voicesReady,
    thaiVoiceAvailable: isOfflineVoiceAvailable(voices, 'th'),
    englishVoiceAvailable: isOfflineVoiceAvailable(voices, 'en'),
    speaking,
    activeChunkIndex,
    activeWord,
    speak,
    speakChunk,
    stop,
  };
}
