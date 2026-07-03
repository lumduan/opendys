import { useMemo } from 'react';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/context/settingsContext';
import { useSpeech } from '@/hooks/useSpeech';
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
  const { settings } = useSettings();
  const speech = useSpeech();

  const chunks = useMemo(() => splitSpeechChunks(text), [text]);
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

  const handleSpeakChunk = (index: number, chunkText: string) => {
    if (voiceAvailable) speech.speakChunk(chunkText, lang, index, settings.ttsRate);
  };

  return (
    <div>
      {speech.supported && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {speech.speaking ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={speech.stop}>
              {t.stop}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => speech.speak(text, lang, settings.ttsRate)}
              disabled={!voiceAvailable}
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
        </div>
      )}

      <ReadingRuler enabled={settings.ruler} dim={settings.rulerDim} bandPx={settings.rulerBandPx}>
        <div
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
    </div>
  );
}
