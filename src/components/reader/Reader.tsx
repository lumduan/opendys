import { useEffect, useMemo, useRef } from 'react';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/context/settingsContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useWordHighlight } from '@/hooks/useWordHighlight';
import { useAsr } from '@/hooks/useAsr';
import { useAsrHighlight } from '@/hooks/useAsrHighlight';
import { saveAsrSession } from '@/services/asr/asrHistory';
import {
  buildGuideBackground,
  buildReaderStyle,
  paletteFor,
  splitSpeechChunks,
  type SpeechLang,
} from '@/utils/reader';
import { isThai, codePointOf } from '@/utils/thai';
import { Chunk } from './Chunk';
import { ReadingRuler } from './ReadingRuler';

interface ReaderProps {
  text: string;
  lang: SpeechLang;
}

function containsThai(text: string): boolean {
  for (const ch of text) {
    if (isThai(codePointOf(ch))) return true;
  }
  return false;
}

export function Reader({ text, lang }: ReaderProps) {
  const t = strings.en.reader;
  const tAsr = strings.en.asr;
  const { settings } = useSettings();
  const speech = useSpeech();
  const asr = useAsr();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const chunks = useMemo(() => splitSpeechChunks(text), [text]);
  // Karaoke: paint the currently-spoken word (from onboundary) via the CSS Custom Highlight API. A
  // no-op where onboundary / the API are unavailable (e.g. iOS Safari) — the sentence highlight stays.
  useWordHighlight(speech.activeWord, chunks, surfaceRef);
  // Reading assessment: paint asr-correct/-error/-current over the same surface (coexists by name with
  // reader-word). No-op until a Practice session produces an evaluation.
  useAsrHighlight(asr.evaluation, chunks, surfaceRef);

  // A new target (ReaderPage edit or a fresh OCR result) invalidates any prior assessment/highlight.
  // Depend on the stable `reset` callback — NOT the whole `asr` (a fresh object each render, which would
  // reset every render and clear the evaluation).
  const resetAsr = asr.reset;
  useEffect(() => {
    resetAsr();
  }, [text, lang, resetAsr]);
  const hasThai = useMemo(() => containsThai(text), [text]);
  const palette = useMemo(() => paletteFor(settings.palette), [settings.palette]);

  const surfaceStyle = useMemo(() => {
    const style = buildReaderStyle(settings);
    if (settings.guideLines && hasThai) {
      Object.assign(style, buildGuideBackground(settings.fontSizePx, settings.lineHeight));
    }
    return style;
  }, [settings, hasThai]);

  const voiceAvailable = lang === 'th' ? speech.thaiVoiceAvailable : speech.englishVoiceAvailable;

  const asrAvailable = asr.supported && asr.typhoonAsrAvailable;
  const recording = asr.status === 'requesting' || asr.status === 'recording';
  const canPractice = asrAvailable && text.trim() !== '';
  const accuracyPct = Math.round((asr.evaluation?.accuracy ?? 0) * 100);
  const missed = asr.evaluation ? [...asr.evaluation.mispronounced, ...asr.evaluation.skipped] : [];

  const handleSpeakChunk = (index: number, chunkText: string) => {
    if (voiceAvailable) speech.speakChunk(chunkText, lang, index, settings.ttsRate);
  };

  const handlePractice = () => {
    speech.stop(); // stop TTS first: frees the audio channel (no mic feedback) and clears reader-word
    void asr.start(text, lang);
  };

  const handleStopPractice = () => {
    const session = asr.stop();
    if (session) saveAsrSession(session);
  };

  return (
    <div>
      {(speech.supported || asrAvailable) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {speech.supported && (
            <>
              {speech.speaking ? (
                <button type="button" className="btn btn-sm btn-primary" onClick={speech.stop}>
                  {t.stop}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => speech.speak(text, lang, settings.ttsRate)}
                  disabled={!voiceAvailable || recording}
                  data-testid="read-aloud"
                >
                  🔊 {t.readAloud}
                </button>
              )}
              {!voiceAvailable && speech.voicesReady && (
                <span className="text-xs text-base-content/80" data-testid="tts-degrade">
                  ⚠ {lang === 'th' ? t.noThaiVoice : t.noVoice}
                </span>
              )}
            </>
          )}

          {asrAvailable &&
            (recording ? (
              <button
                type="button"
                className="btn btn-sm btn-error"
                onClick={handleStopPractice}
                data-testid="asr-stop"
              >
                {tAsr.stop}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handlePractice}
                disabled={!canPractice || speech.speaking}
                data-testid="practice"
              >
                🎤 {tAsr.practice}
              </button>
            ))}

          {asr.status === 'requesting' && <span className="text-sm">{tAsr.requesting}</span>}
          {asr.status === 'recording' && (
            <span className="text-sm text-success">{tAsr.recording}</span>
          )}
          {asr.status === 'processing' && <span className="text-sm">{tAsr.processing}</span>}
        </div>
      )}

      {recording && (
        <div role="note" className="alert alert-warning mb-3 text-sm" data-testid="asr-consent">
          <span>{tAsr.cloudNotice}</span>
        </div>
      )}

      {asr.error && (
        <div role="alert" className="alert alert-error mb-3 text-sm" data-testid="asr-error">
          <span>{tAsr.errors[asr.error]}</span>
        </div>
      )}

      <ReadingRuler enabled={settings.ruler} dim={settings.rulerDim} bandPx={settings.rulerBandPx}>
        <div
          ref={surfaceRef}
          className="reader-surface whitespace-pre-wrap break-words rounded-box bg-base-100 p-5 shadow-sm"
          style={surfaceStyle}
          lang={lang}
          data-testid="reader-surface"
        >
          {chunks.map((chunk, index) => (
            <Chunk
              key={index}
              raw={chunk.raw}
              index={index}
              colorCoding={settings.colorCoding}
              palette={palette}
              active={index === speech.activeChunkIndex}
              speakable={chunk.speak !== '' && voiceAvailable}
              onSpeak={handleSpeakChunk}
            />
          ))}
        </div>
      </ReadingRuler>

      {asr.evaluation && (
        <div className="mt-3 rounded-box bg-base-100 p-4 shadow-sm" data-testid="asr-readout">
          <div className="text-sm">
            <span className="font-semibold">{tAsr.accuracyLabel}:</span> {accuracyPct}%
          </div>
          {missed.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-semibold">{tAsr.mispronouncedLabel}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {missed.map((word, i) => (
                  <span key={i} className="badge badge-error badge-sm" lang={lang}>
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
