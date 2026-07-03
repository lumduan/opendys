import { useState } from 'react';
import { strings } from '@/i18n/strings';
import type { OcrLanguage } from '@/utils/ocr';
import { detectPrimaryScript, type SpeechLang } from '@/utils/reader';
import { Reader } from '@/components/reader/Reader';

interface OcrResultProps {
  text: string;
  confidence: number | null;
  language: OcrLanguage;
  onNewImage: () => void;
}

function readerLangFor(language: OcrLanguage, text: string): SpeechLang {
  if (language === 'eng') return 'en';
  if (language === 'tha') return 'th';
  return detectPrimaryScript(text); // eng+tha → pick the dominant script
}

export function OcrResult({ text, confidence, language, onNewImage }: OcrResultProps) {
  const t = strings.en.ocr;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  if (!text.trim()) {
    return (
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <p className="text-base-content/80">{t.result.empty}</p>
        <button type="button" className="btn btn-outline btn-sm mt-4" onClick={onNewImage}>
          {t.result.newImage}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-box bg-base-100 p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t.result.heading}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? t.result.copied : t.result.copy}
        </button>
      </div>

      <Reader text={text} lang={readerLangFor(language, text)} />

      {confidence !== null && (
        <p className="mt-3 text-xs text-base-content/60">
          {t.result.confidence}: {Math.round(confidence)}%
        </p>
      )}

      <div className="mt-4">
        <button type="button" className="btn btn-outline btn-sm" onClick={onNewImage}>
          {t.result.newImage}
        </button>
      </div>
    </div>
  );
}
