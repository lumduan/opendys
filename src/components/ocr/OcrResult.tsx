import { useMemo, useState } from 'react';
import { strings } from '@/i18n/strings';
import type { OcrLanguage } from '@/utils/ocr';
import { buildTextStyle } from '@/utils/latin';
import { toColorClusters } from '@/utils/thai';

interface OcrResultProps {
  text: string;
  confidence: number | null;
  language: OcrLanguage;
  onNewImage: () => void;
}

export function OcrResult({ text, confidence, language, onNewImage }: OcrResultProps) {
  const t = strings.en.ocr;
  const hasThai = language !== 'eng';
  const [colorView, setColorView] = useState(hasThai);
  const [copied, setCopied] = useState(false);

  const clusters = useMemo(() => toColorClusters(text), [text]);
  const readerStyle = buildTextStyle({ fontSizePx: 26, lineHeight: 2.1, letterSpacingEm: 0.02 });

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
        <div className="flex gap-2">
          {hasThai && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setColorView((v) => !v)}
            >
              {colorView ? t.result.plainView : t.result.colorView}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? t.result.copied : t.result.copy}
          </button>
        </div>
      </div>

      {hasThai && colorView ? (
        <p
          style={readerStyle}
          lang="th"
          className="whitespace-pre-wrap break-words rounded-box bg-base-200/40 p-4"
        >
          {clusters.map((cluster, clusterIndex) => (
            <span key={clusterIndex}>
              {cluster.tokens.map((token, tokenIndex) => (
                <span key={tokenIndex} style={{ color: token.color }}>
                  {token.char}
                </span>
              ))}
            </span>
          ))}
        </p>
      ) : (
        <p
          style={readerStyle}
          lang={hasThai ? 'th' : 'en'}
          className="whitespace-pre-wrap break-words rounded-box bg-base-200/40 p-4"
        >
          {text}
        </p>
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
