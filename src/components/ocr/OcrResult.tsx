import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/i18nContext';
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
  const t = useTranslation().t.ocr;
  const [copied, setCopied] = useState(false);
  // `draft` is the editable source of truth: it mirrors the recognized `text` but the user can correct
  // OCR mistakes. Reader/TTS/Practice/Copy all read from `draft`, so an edit flows everywhere once Done.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  // A fresh OCR result resets the draft and closes the editor.
  useEffect(() => {
    setDraft(text);
    setEditing(false);
  }, [text]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
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
        <div className="flex gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? t.result.copied : t.result.copy}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditing((value) => !value)}
            data-testid="ocr-edit-toggle"
          >
            {editing ? t.result.done : t.result.edit}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          className="textarea textarea-bordered w-full"
          rows={6}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          data-testid="ocr-edit"
        />
      ) : (
        <Reader text={draft} lang={readerLangFor(language, draft)} />
      )}

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
