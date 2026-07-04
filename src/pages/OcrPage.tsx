import { useState } from 'react';
import { Link } from 'react-router-dom';
import { strings } from '@/i18n/strings';
import { useOcr } from '@/hooks/useOcr';
import type { OcrLanguage } from '@/utils/ocr';
import type { OcrEngineKind } from '@/services/ocr/tesseractClient';
import { UploadDropzone } from '@/components/ocr/UploadDropzone';
import { CapturePanel } from '@/components/ocr/CapturePanel';
import { LanguageSelect } from '@/components/ocr/LanguageSelect';
import { EngineToggle } from '@/components/ocr/EngineToggle';
import { OcrProgress } from '@/components/ocr/OcrProgress';
import { OcrResult } from '@/components/ocr/OcrResult';

export function OcrPage() {
  const t = strings.en.ocr;
  const [language, setLanguage] = useState<OcrLanguage>('eng+tha');
  const [engine, setEngine] = useState<OcrEngineKind>('tesseract');
  const [source, setSource] = useState<'upload' | 'camera'>('upload');
  const ocr = useOcr();

  const busy = ocr.status === 'preparing' || ocr.status === 'recognizing';
  const showInput = ocr.status === 'idle' || ocr.status === 'error';

  const handleImage = (file: File | Blob) => {
    void ocr.recognize(file, language, engine);
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-base-content/70">{t.intro}</p>
        </div>
        <Link to="/" className="link shrink-0 text-sm">
          ← Home
        </Link>
      </header>

      {!ocr.isSupported && (
        <div role="alert" className="alert alert-warning mb-6">
          <span>{t.errors.unsupported}</span>
        </div>
      )}

      {showInput && (
        <div className="space-y-4">
          <LanguageSelect value={language} onChange={setLanguage} disabled={busy} />

          {ocr.typhoonAvailable && (
            <EngineToggle value={engine} onChange={setEngine} disabled={busy} />
          )}

          <div role="tablist" className="tabs tabs-boxed w-fit">
            <button
              role="tab"
              type="button"
              className={`tab ${source === 'upload' ? 'tab-active' : ''}`}
              onClick={() => setSource('upload')}
            >
              {t.tabUpload}
            </button>
            <button
              role="tab"
              type="button"
              className={`tab ${source === 'camera' ? 'tab-active' : ''}`}
              onClick={() => setSource('camera')}
            >
              {t.tabCamera}
            </button>
          </div>

          {source === 'upload' ? (
            <UploadDropzone onFile={handleImage} disabled={!ocr.isSupported} />
          ) : (
            <CapturePanel onCapture={handleImage} disabled={!ocr.isSupported} />
          )}

          {ocr.status === 'error' && ocr.error && (
            <div role="alert" className="alert alert-error">
              <span>{t.errors[ocr.error]}</span>
            </div>
          )}
        </div>
      )}

      {busy && ocr.progress && (
        <OcrProgress progress={ocr.progress} onCancel={ocr.cancel} />
      )}

      {ocr.status === 'done' && ocr.text !== null && (
        <OcrResult
          text={ocr.text}
          confidence={ocr.confidence}
          language={language}
          onNewImage={ocr.reset}
        />
      )}
    </section>
  );
}
